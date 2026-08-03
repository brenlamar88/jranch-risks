# J Ranch Risks

A Risk Assessment Program (RAP) web app — Vite + React + TypeScript + Tailwind CSS + shadcn/ui, backed by Supabase (Postgres, Auth, Edge Functions).

This repository was scaffolded from the structure of the `freedomrap` app as a **clean slate**: it contains the full application code and database schema (migrations), but **no application data** and **no link to the original database**. You connect it to your own separate Supabase project.

## Tech stack

- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, React Router
- **Backend:** Supabase — Postgres database, Row Level Security, Auth, Edge Functions (Deno)
- **Email:** Resend (used by the notification/invite edge functions)

## Prerequisites

- Node.js 18+ (or Bun)
- A **new** Supabase project (this is your "separate database")
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for applying migrations & deploying functions)

## 1. Install dependencies

```bash
npm install
```

## 2. Connect your separate database

1. Create a new project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and fill in the values from your new project
   (Supabase dashboard → Project Settings → API / General):

   ```bash
   cp .env.example .env
   ```

   | Variable | Where to find it |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Settings → API → Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Settings → API → anon / publishable key |
   | `VITE_SUPABASE_PROJECT_ID` | Settings → General → Reference ID |

3. Set the same reference ID in `supabase/config.toml` (`project_id = "..."`).

## 3. Apply the database schema

The `supabase/migrations/` folder defines the full schema (risks, profiles, facilities, roles, RLS policies, etc.). Apply it to your new, empty project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This creates all the tables with **no data** — a clean slate.

## 4. Deploy the edge functions (optional)

The functions under `supabase/functions/` handle user management and email. They rely on these secrets set in your Supabase project:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (provided by Supabase automatically for deployed functions)
- `RESEND_API_KEY` (your [Resend](https://resend.com) API key, for email)

```bash
supabase functions deploy
supabase secrets set RESEND_API_KEY=your-resend-key
```

## 5. Run locally

```bash
npm run dev
```

The app runs at http://localhost:5173.

## Available scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

## Project structure

```
src/
  components/        UI + feature components (risk forms, tables, charts)
  components/ui/     shadcn/ui primitives
  hooks/             React hooks (admin checks, facility access)
  integrations/      Supabase client + generated types
  lib/               Supabase wrapper, db types, utilities
  pages/             Routed pages (Dashboard, Admin, Auth, Reports, ...)
supabase/
  migrations/        SQL schema history (applied via `supabase db push`)
  functions/         Deno edge functions
  config.toml        Supabase project link
```

## Notes

- Never commit your real `.env` — it is gitignored. Only `.env.example` is tracked.
- The original database (`freedomrap`) is intentionally **not** referenced here; nothing in this repo points at it.
