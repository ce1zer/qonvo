-- Add conversations.goal (optional)
-- Used by the "Start gesprek" wizard to store an optional training goal.

alter table public.conversations
  add column if not exists goal text null;

