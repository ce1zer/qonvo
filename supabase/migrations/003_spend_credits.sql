-- Credit spending RPC (atomic, non-negative)
-- This function inserts into credit_ledger (append-only) and returns the updated cached balance.
-- Assumes your existing trigger on credit_ledger updates companies.credits_balance and prevents going negative.

create or replace function public.spend_credits(
  company_id uuid,
  amount bigint,
  reason text,
  conversation_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_new_balance bigint;
begin
  if amount is null or amount <= 0 then
    raise exception 'amount must be > 0' using errcode = '22023';
  end if;

  -- Tenant access (platform admins bypass)
  if not public.is_platform_admin() and public.current_company_id() is distinct from company_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Insert ledger entry. Trigger/constraint should prevent balance < 0.
  insert into public.credit_ledger (
    company_id,
    conversation_id,
    amount,
    reason,
    metadata,
    created_by
  ) values (
    company_id,
    conversation_id,
    -amount,
    reason,
    jsonb_build_object('source','api'),
    auth.uid()
  );

  select c.credits_balance
    into v_new_balance
  from public.companies c
  where c.id = company_id;

  if v_new_balance is null then
    raise exception 'company_not_found' using errcode = '23503';
  end if;

  return v_new_balance;
end;
$$;

grant execute on function public.spend_credits(uuid, bigint, text, uuid) to authenticated;

