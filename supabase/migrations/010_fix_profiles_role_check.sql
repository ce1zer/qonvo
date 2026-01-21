-- Fix profiles role check constraint to allow organization_admin (breaking rename)
-- Some databases have an existing constraint like:
--   constraint profiles_role_check check (role in ('member','company_admin','platform_admin'))
-- This migration makes it:
--   ('member','organization_admin','platform_admin')

begin;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
end;
$$;

do $$
begin
  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('member', 'organization_admin', 'platform_admin'));
exception
  when duplicate_object then
    -- already exists; ignore
    null;
end;
$$;

commit;

