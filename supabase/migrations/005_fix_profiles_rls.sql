-- Fix profiles RLS so authenticated users can read their own profile.
-- This unblocks login and tenant routing.
--
-- Why this is necessary:
-- - If RLS is enabled on public.profiles but there is no SELECT policy that allows the
--   logged-in user to read their row, the app will behave as if the user is not linked
--   to a company (company_id appears missing).

-- Ensure RLS is enabled (safe if already enabled)
alter table public.profiles enable row level security;

-- Helper functions used by RLS policies.
-- We define them here because policy expressions must not self-reference `profiles` directly
-- (that can trigger infinite recursion under RLS).

create or replace function public.current_company_id()
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select p.company_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_company_id() to authenticated;

create or replace function public.current_role()
returns text
language sql
security definer
stable
set search_path = public, auth
as $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_role() to authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select public.current_role() = 'platform_admin';
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- Drop + recreate policies (idempotent)
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_company_admin_same_company on public.profiles;
drop policy if exists profiles_select_platform_admin on public.profiles;

-- 1) Any authenticated user can read their own profile row
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

-- 2) Company admins can read all profiles within their company (tenant-scoped)
create policy profiles_select_company_admin_same_company
on public.profiles
for select
to authenticated
using (
  public.current_role() = 'company_admin'
  and public.current_company_id() = company_id
);

-- 3) Platform admins can read all profiles
create policy profiles_select_platform_admin
on public.profiles
for select
to authenticated
using (public.is_platform_admin());

