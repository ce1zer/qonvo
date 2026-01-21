-- Repair legacy/invalid profile role values before enforcing profiles_role_check
-- This addresses cases where existing rows still contain 'company_admin' (or other legacy values).

begin;

-- 1) Map legacy roles to new roles
update public.profiles
set role = 'organization_admin'
where role = 'company_admin';

-- Optional hardening: if role is null, default to 'member'
update public.profiles
set role = 'member'
where role is null;

-- 2) For any other unexpected roles, downgrade to 'member' to unblock constraint enforcement.
update public.profiles
set role = 'member'
where role not in ('member', 'organization_admin', 'platform_admin');

-- 3) Recreate constraint to match new role set
alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'organization_admin', 'platform_admin'));

commit;

