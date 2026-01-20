# Qonvo

Next.js (App Router) + Supabase Auth (SSR) foundation.

## Setup

1. Create a `.env.local` (or copy values into your hosting provider env vars) based on:
   - `env.local` (rename it to `.env.local` in your IDE)

   Chat integration (n8n):
   - `N8N_WEBHOOK_URL`
   - `N8N_WEBHOOK_SECRET`

2. Ensure your Supabase database has the required tables (`companies`, `profiles`, `credit_ledger`, etc.).

3. Install and run:

```bash
npm install
npm run dev
```

## Routes

- `/signup` — 2-step wizard: company + account
- `/login` — login and redirect to `/bedrijf/[slug]/dashboard`

