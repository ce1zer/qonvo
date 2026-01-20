-- Embed (MVP) foundations
--
-- Note: migration numbering continues from existing migrations.

create table if not exists public.embed_tokens (
  token uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

-- If the table existed from an earlier attempt, ensure the expected columns exist.
-- (create table if not exists does not add missing columns)
alter table public.embed_tokens
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists created_by uuid null references auth.users(id);

create index if not exists embed_tokens_company_id_idx
  on public.embed_tokens (company_id);

create index if not exists embed_tokens_scenario_id_idx
  on public.embed_tokens (scenario_id);

create index if not exists embed_tokens_active_idx
  on public.embed_tokens (active);

-- Allow one active token per scenario (regenerate by setting old token inactive later)
create unique index if not exists embed_tokens_one_active_per_scenario
  on public.embed_tokens (scenario_id)
  where active = true;

alter table public.embed_tokens enable row level security;

-- Any authenticated user in the same tenant can read embed tokens (needed for /embed/[token] lookups).
drop policy if exists embed_tokens_select_in_tenant on public.embed_tokens;
create policy embed_tokens_select_in_tenant
  on public.embed_tokens
  for select
  to authenticated
  using (
    public.is_platform_admin()
    or public.current_company_id() is not distinct from company_id
  );

-- Only company_admin / platform_admin can create embed tokens (token generation is an admin action).
drop policy if exists embed_tokens_insert_admin_only on public.embed_tokens;
create policy embed_tokens_insert_admin_only
  on public.embed_tokens
  for insert
  to authenticated
  with check (
    public.is_platform_admin()
    or (
      public.current_company_id() is not distinct from company_id
      and public.current_role() = 'company_admin'
    )
  );

-- Optional: allow admins to deactivate tokens later (not used yet, but keeps foundations clean).
drop policy if exists embed_tokens_update_admin_only on public.embed_tokens;
create policy embed_tokens_update_admin_only
  on public.embed_tokens
  for update
  to authenticated
  using (
    public.is_platform_admin()
    or (
      public.current_company_id() is not distinct from company_id
      and public.current_role() = 'company_admin'
    )
  )
  with check (
    public.is_platform_admin()
    or (
      public.current_company_id() is not distinct from company_id
      and public.current_role() = 'company_admin'
    )
  );

-- Guardrail: if an older incompatible schema exists (e.g. token_hash), fail loudly.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'embed_tokens'
      and column_name = 'token_hash'
  ) then
    raise exception
      'public.embed_tokens has legacy column token_hash. Drop and recreate the table to match migration 006 (token uuid primary key). Then reload Supabase API schema cache.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'embed_tokens'
      and column_name = 'token'
      and udt_name = 'uuid'
  ) then
    raise exception
      'public.embed_tokens is missing token uuid column. Ensure the table matches migration 006 (token uuid primary key) and reload Supabase API schema cache.';
  end if;
end $$;

