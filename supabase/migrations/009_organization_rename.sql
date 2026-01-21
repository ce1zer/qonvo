-- Breaking rename: company -> organization (and UI copy uses “organisatie” terminology)
-- This migration renames tables/columns, updates role values, and recreates helper/RPC functions + RLS policies.

begin;

-- 1) Rename base table: companies -> organizations
do $$
begin
  if to_regclass('public.companies') is not null and to_regclass('public.organizations') is null then
    alter table public.companies rename to organizations;
  end if;
end;
$$;

-- 2) Rename company_id columns to organization_id where relevant (best-effort, idempotent)
do $$
declare
  rec record;
begin
  for rec in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'company_id'
      and table_name in ('profiles', 'credit_ledger', 'audit_log', 'embed_tokens', 'scenarios', 'conversations')
  loop
    execute format('alter table %I.%I rename column company_id to organization_id', rec.table_schema, rec.table_name);
  end loop;
end;
$$;

-- 3) Rename helper function current_company_id -> current_organization_id (create new; drop old later)
create or replace function public.current_organization_id()
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select p.organization_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_organization_id() to authenticated;

-- 4) Update role values: company_admin -> organization_admin
update public.profiles
set role = 'organization_admin'
where role = 'company_admin';

-- 5) Recreate profile RLS policies to use organization_id + organization_admin
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_company_admin_same_company on public.profiles;
drop policy if exists profiles_select_platform_admin on public.profiles;
drop policy if exists profiles_select_organization_admin_same_organization on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

create policy profiles_select_organization_admin_same_organization
on public.profiles
for select
to authenticated
using (
  public.current_role() = 'organization_admin'
  and public.current_organization_id() = organization_id
);

create policy profiles_select_platform_admin
on public.profiles
for select
to authenticated
using (public.is_platform_admin());

-- 6) Embed tokens: rename company_id -> organization_id + indexes + policies
do $$
begin
  if to_regclass('public.embed_tokens') is not null then
    alter table public.embed_tokens enable row level security;
  end if;
end;
$$;

-- Index rename (best-effort; ok if already renamed or missing)
do $$
begin
  if to_regclass('public.embed_tokens_company_id_idx') is not null then
    alter index public.embed_tokens_company_id_idx rename to embed_tokens_organization_id_idx;
  end if;
exception when others then
  -- ignore
end;
$$;

drop policy if exists embed_tokens_select_same_company_or_platform_admin on public.embed_tokens;
drop policy if exists embed_tokens_insert_admin_only on public.embed_tokens;
drop policy if exists embed_tokens_update_admin_only on public.embed_tokens;

create policy embed_tokens_select_same_organization_or_platform_admin
  on public.embed_tokens
  for select
  to authenticated
  using (
    public.is_platform_admin()
    or public.current_organization_id() is not distinct from organization_id
  );

create policy embed_tokens_insert_admin_only
  on public.embed_tokens
  for insert
  to authenticated
  with check (
    public.is_platform_admin()
    or (
      public.current_organization_id() is not distinct from organization_id
      and public.current_role() = 'organization_admin'
    )
  );

create policy embed_tokens_update_admin_only
  on public.embed_tokens
  for update
  to authenticated
  using (
    public.is_platform_admin()
    or (
      public.current_organization_id() is not distinct from organization_id
      and public.current_role() = 'organization_admin'
    )
  )
  with check (
    public.is_platform_admin()
    or (
      public.current_organization_id() is not distinct from organization_id
      and public.current_role() = 'organization_admin'
    )
  );

-- 7) RPCs: drop old company-named functions and recreate organization-named equivalents
drop function if exists public.admin_adjust_credits(uuid, bigint, text);
drop function if exists public.admin_set_company_disabled(uuid, boolean);
drop function if exists public.admin_set_user_role(uuid, text);
drop function if exists public.spend_credits(uuid, bigint, text, uuid);

create or replace function public.admin_adjust_credits(
  organization_id uuid,
  amount bigint,
  reason text
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_new_balance bigint;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if amount is null or amount = 0 then
    raise exception 'amount must be non-zero' using errcode = '22023';
  end if;

  insert into public.credit_ledger (
    organization_id,
    conversation_id,
    amount,
    reason,
    metadata,
    created_by
  ) values (
    organization_id,
    null,
    amount,
    reason,
    jsonb_build_object('source','admin'),
    auth.uid()
  );

  insert into public.audit_log (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    organization_id,
    auth.uid(),
    'admin.adjust_credits',
    'organization',
    organization_id,
    jsonb_build_object('amount', amount, 'reason', reason)
  );

  select o.credits_balance into v_new_balance
  from public.organizations o
  where o.id = organization_id;

  return v_new_balance;
end;
$$;

grant execute on function public.admin_adjust_credits(uuid, bigint, text) to authenticated;

create or replace function public.admin_set_organization_disabled(
  organization_id uuid,
  is_disabled boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.organizations
    set is_disabled = admin_set_organization_disabled.is_disabled,
        updated_at = now()
  where id = organization_id;

  insert into public.audit_log (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    organization_id,
    auth.uid(),
    'admin.set_organization_disabled',
    'organization',
    organization_id,
    jsonb_build_object('is_disabled', admin_set_organization_disabled.is_disabled)
  );
end;
$$;

grant execute on function public.admin_set_organization_disabled(uuid, boolean) to authenticated;

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_organization_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if new_role not in ('member', 'organization_admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  select p.organization_id into v_organization_id
  from public.profiles p
  where p.user_id = target_user_id;

  update public.profiles
    set role = new_role,
        updated_at = now()
  where user_id = target_user_id;

  insert into public.audit_log (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_organization_id,
    auth.uid(),
    'admin.set_user_role',
    'profile',
    target_user_id,
    jsonb_build_object('new_role', new_role)
  );
end;
$$;

grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

create or replace function public.spend_credits(
  organization_id uuid,
  amount bigint,
  reason text,
  conversation_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_new_balance bigint;
begin
  if amount is null or amount <= 0 then
    raise exception 'amount must be > 0' using errcode = '22023';
  end if;

  -- Tenant access (platform admins bypass)
  if not public.is_platform_admin() and public.current_organization_id() is distinct from organization_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.credit_ledger (
    organization_id,
    conversation_id,
    amount,
    reason,
    metadata,
    created_by
  ) values (
    organization_id,
    conversation_id,
    -amount,
    reason,
    jsonb_build_object('source','api'),
    auth.uid()
  );

  select o.credits_balance
    into v_new_balance
  from public.organizations o
  where o.id = organization_id;

  if v_new_balance is null then
    raise exception 'organization_not_found' using errcode = '23503';
  end if;

  return v_new_balance;
end;
$$;

grant execute on function public.spend_credits(uuid, bigint, text, uuid) to authenticated;

-- 8) Best-effort cleanup: drop old helper if present
drop function if exists public.current_company_id();

commit;

