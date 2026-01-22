-- Store AI conversation reviews generated via n8n (Pattern A: app pulls review and stores it).

begin;

create table if not exists public.conversation_reviews (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_json jsonb not null,
  feedback_summary text null,
  is_passed boolean null,
  created_at timestamptz not null default now()
);

create unique index if not exists conversation_reviews_one_per_conversation
  on public.conversation_reviews (conversation_id);

create index if not exists conversation_reviews_org_idx
  on public.conversation_reviews (organization_id, created_at desc);

alter table public.conversation_reviews enable row level security;

-- Tenant users can read reviews within their organization (and platform admins can read all).
drop policy if exists conversation_reviews_select_in_tenant on public.conversation_reviews;
create policy conversation_reviews_select_in_tenant
  on public.conversation_reviews
  for select
  to authenticated
  using (
    public.is_platform_admin()
    or public.current_organization_id() is not distinct from organization_id
  );

commit;

