# Qonvo

Next.js (App Router) + Supabase Auth (SSR) foundation.

## Setup

1. Create a `.env.local` (or copy values into your hosting provider env vars).
   Required for auth and signup:
   - `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_KEY`) for server-side signup

   Chat integration (n8n):
   - `N8N_WEBHOOK_URL`
   - `N8N_WEBHOOK_SECRET`

2. Ensure your Supabase database has the required tables (`organizations`, `profiles`, `credit_ledger`, etc.).
   - After applying new migrations (especially renames), **reload the Supabase API schema cache** (PostgREST) in the Supabase dashboard and restart your dev server.

3. Install and run:

```bash
npm install
npm run dev
```

## Routes

- `/signup` — 2-step wizard: organization + account
- `/login` — login and redirect to `/organisatie/[slug]/dashboard`

