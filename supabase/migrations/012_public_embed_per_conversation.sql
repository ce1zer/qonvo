-- Public embed per conversation (token-based, no login)
-- - conversations: public_embed_enabled + embed_allowed_origins
-- - conversation_embed_tokens: one active token per conversation
-- - embed_rate_limits + RPC for atomic rate limiting
-- - embed_spend_credits RPC for service_role to spend organization credits for public embed chats

begin;

-- 1) Conversation settings
alter table public.conversations
  add column if not exists public_embed_enabled boolean not null default false;

alter table public.conversations
  add column if not exists embed_allowed_origins text[] null;

-- 2) Token table (one active token per conversation)
create table if not exists public.conversation_embed_tokens (
  token uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create unique index if not exists conversation_embed_tokens_one_active_per_conversation
  on public.conversation_embed_tokens (conversation_id)
  where active = true;

create index if not exists conversation_embed_tokens_org_idx
  on public.conversation_embed_tokens (organization_id);

alter table public.conversation_embed_tokens enable row level security;

-- Tenant users can read embed tokens for their organization (needed for showing embed URL in-app).
drop policy if exists conversation_embed_tokens_select_in_tenant on public.conversation_embed_tokens;
create policy conversation_embed_tokens_select_in_tenant
  on public.conversation_embed_tokens
  for select
  to authenticated
  using (
    public.is_platform_admin()
    or public.current_organization_id() is not distinct from organization_id
  );

-- Only organization_admin / platform_admin can manage tokens.
drop policy if exists conversation_embed_tokens_insert_admin_only on public.conversation_embed_tokens;
create policy conversation_embed_tokens_insert_admin_only
  on public.conversation_embed_tokens
  for insert
  to authenticated
  with check (
    public.is_platform_admin()
    or (
      public.current_organization_id() is not distinct from organization_id
      and public.current_role() = 'organization_admin'
    )
  );

drop policy if exists conversation_embed_tokens_update_admin_only on public.conversation_embed_tokens;
create policy conversation_embed_tokens_update_admin_only
  on public.conversation_embed_tokens
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

-- 3) Rate limiting storage (service role only; RLS bypass)
create table if not exists public.embed_rate_limits (
  token uuid not null,
  ip text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (token, ip, window_start)
);

-- Atomic rate-limit check + increment
create or replace function public.embed_rate_limit_hit(
  p_token uuid,
  p_ip text,
  p_max_hits integer,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_window_start timestamptz;
  v_new_count integer;
begin
  -- Only allow service_role to call this
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_window_seconds is null or p_window_seconds < 10 then
    raise exception 'invalid_window' using errcode = '22023';
  end if;

  -- Align to window boundary
  v_window_start :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.embed_rate_limits(token, ip, window_start, count)
  values (p_token, p_ip, v_window_start, 1)
  on conflict (token, ip, window_start)
  do update set count = public.embed_rate_limits.count + 1
  returning count into v_new_count;

  return v_new_count <= p_max_hits;
end;
$$;

-- 4) Spend credits for embed without relying on auth.uid() / tenant checks (service role only)
create or replace function public.embed_spend_credits(
  p_organization_id uuid,
  p_amount bigint,
  p_reason text,
  p_conversation_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_new_balance bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be > 0' using errcode = '22023';
  end if;

  insert into public.credit_ledger (
    organization_id,
    conversation_id,
    amount,
    reason,
    metadata,
    created_by
  ) values (
    p_organization_id,
    p_conversation_id,
    -p_amount,
    p_reason,
    jsonb_build_object('source','embed'),
    null
  );

  select o.credits_balance
    into v_new_balance
  from public.organizations o
  where o.id = p_organization_id;

  if v_new_balance is null then
    raise exception 'organization_not_found' using errcode = '23503';
  end if;

  return v_new_balance;
end;
$$;

commit;

