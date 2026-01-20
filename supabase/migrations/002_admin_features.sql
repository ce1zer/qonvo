-- Platform admin features
-- - companies.is_disabled (soft flag)
-- - admin RPCs with audit logging
-- IMPORTANT: apply this in Supabase SQL Editor or via Supabase CLI migrations.

alter table public.companies
  add column if not exists is_disabled boolean not null default false;

create index if not exists companies_is_disabled_idx
  on public.companies (is_disabled);

create or replace function public.admin_adjust_credits(
  company_id uuid,
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
    company_id,
    conversation_id,
    amount,
    reason,
    metadata,
    created_by
  ) values (
    company_id,
    null,
    amount,
    reason,
    jsonb_build_object('source','admin'),
    auth.uid()
  );

  insert into public.audit_log (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    company_id,
    auth.uid(),
    'admin.adjust_credits',
    'company',
    company_id,
    jsonb_build_object('amount', amount, 'reason', reason)
  );

  select c.credits_balance into v_new_balance
  from public.companies c
  where c.id = company_id;

  return v_new_balance;
end;
$$;

grant execute on function public.admin_adjust_credits(uuid, bigint, text) to authenticated;

create or replace function public.admin_set_company_disabled(
  company_id uuid,
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

  update public.companies
    set is_disabled = admin_set_company_disabled.is_disabled,
        updated_at = now()
  where id = company_id;

  insert into public.audit_log (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    company_id,
    auth.uid(),
    'admin.set_company_disabled',
    'company',
    company_id,
    jsonb_build_object('is_disabled', admin_set_company_disabled.is_disabled)
  );
end;
$$;

grant execute on function public.admin_set_company_disabled(uuid, boolean) to authenticated;

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
  v_company_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if new_role not in ('member', 'company_admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  select p.company_id into v_company_id
  from public.profiles p
  where p.user_id = target_user_id;

  update public.profiles
    set role = new_role,
        updated_at = now()
  where user_id = target_user_id;

  insert into public.audit_log (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_company_id,
    auth.uid(),
    'admin.set_user_role',
    'profile',
    target_user_id,
    jsonb_build_object('new_role', new_role)
  );
end;
$$;

grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

