-- Voice preparation (no voice functionality enabled)
-- NOTE: Numbering uses 004 because 002 and 003 already exist in this repo.

-- conversations.mode ('text'|'voice')
alter table public.conversations
  add column if not exists mode text not null default 'text';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_mode_check'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_mode_check check (mode in ('text', 'voice'));
  end if;
end;
$$;

-- messages.input_mode ('text'|'voice'), messages.audio_url
alter table public.messages
  add column if not exists input_mode text not null default 'text';

alter table public.messages
  add column if not exists audio_url text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_input_mode_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_input_mode_check check (input_mode in ('text', 'voice'));
  end if;
end;
$$;

