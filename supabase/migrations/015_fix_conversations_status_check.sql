-- Fix conversations_status_check to allow status = 'inactive'
-- Also repairs legacy values before enforcing the constraint.

begin;

-- Repair legacy/invalid values (best-effort)
update public.conversations
set status = 'inactive'
where status = 'closed';

update public.conversations
set status = 'active'
where status is null;

update public.conversations
set status = 'active'
where status not in ('active', 'inactive');

-- Drop + recreate check constraint
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'conversations_status_check'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations drop constraint conversations_status_check;
  end if;
end;
$$;

do $$
begin
  alter table public.conversations
    add constraint conversations_status_check
    check (status in ('active', 'inactive'));
exception
  when duplicate_object then
    null;
end;
$$;

commit;

