-- Allow service_role (and platform_admin) to delete rows from append-only tables.
-- Needed to support "delete conversation" where messages are append-only.

begin;

create or replace function public.tg_block_update_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Allow deletes for service role (server-side maintenance/admin operations).
  if tg_op = 'DELETE' then
    if auth.role() = 'service_role' then
      return old;
    end if;
    -- Also allow platform admins when running as authenticated user.
    -- (If auth.uid() is null, is_platform_admin() returns false.)
    if public.is_platform_admin() then
      return old;
    end if;
  end if;

  raise exception 'This table is append-only (operation: % is not allowed).', tg_op using errcode = '42501';
end;
$$;

commit;

