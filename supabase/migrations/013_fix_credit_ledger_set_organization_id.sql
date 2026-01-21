-- Fix legacy credit_ledger trigger that still references conversations.company_id.
-- The app now uses organizations + conversations.organization_id.

begin;

-- Replace the legacy function in-place (keeping name for compatibility with existing trigger)
-- so it sets NEW.organization_id based on the conversation.
create or replace function public.tg_credit_ledger_set_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If already provided (e.g. admin_adjust_credits/spend_credits), keep it.
  if new.organization_id is not null then
    return new;
  end if;

  -- If not linked to a conversation, we can't infer it.
  if new.conversation_id is null then
    return new;
  end if;

  select c.organization_id
    into new.organization_id
  from public.conversations c
  where c.id = new.conversation_id;

  return new;
end;
$$;

-- Optional: provide a clearer alias for future triggers/code.
create or replace function public.tg_credit_ledger_set_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.tg_credit_ledger_set_company_id();
end;
$$;

-- Recreate the trigger with the new name (idempotent).
do $$
begin
  if to_regclass('public.credit_ledger') is null then
    return;
  end if;

  drop trigger if exists credit_ledger_set_company_id on public.credit_ledger;
  drop trigger if exists credit_ledger_set_organization_id on public.credit_ledger;

  create trigger credit_ledger_set_organization_id
  before insert on public.credit_ledger
  for each row
  execute function public.tg_credit_ledger_set_company_id();
end;
$$;

commit;

