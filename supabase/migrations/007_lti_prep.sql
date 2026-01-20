-- LTI (prep only) foundations
-- Placeholder table for future LTI registration / launch flows.

create table if not exists public.lti_registrations (
  id uuid primary key default gen_random_uuid(),
  issuer text not null,
  client_id text null,
  deployment_id text null,
  jwks_url text null,
  auth_login_url text null,
  auth_token_url text null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create index if not exists lti_registrations_issuer_idx
  on public.lti_registrations (issuer);

alter table public.lti_registrations enable row level security;

-- Prep only: restrict access to platform admins.
drop policy if exists lti_registrations_platform_admin_only on public.lti_registrations;
create policy lti_registrations_platform_admin_only
  on public.lti_registrations
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

