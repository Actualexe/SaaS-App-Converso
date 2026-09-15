# Converso

A real-time AI teaching platform. You build a "companion" — a tutor configured with a subject, topic, voice and teaching style — and then hold a live voice lesson with it in the browser.

## Stack

| Concern | Tool |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind v4, shadcn (`base-nova`) on `@base-ui/react` |
| Auth & billing | Clerk |
| Database | Supabase (Postgres, RLS keyed off the Clerk JWT) |
| Voice | Vapi (Deepgram transcription, 11Labs voices, OpenAI model) |
| Monitoring | Sentry |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Post sign-in landing route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Post sign-up landing route |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `NEXT_PUBLIC_VAPI_WEB_TOKEN` | Vapi web token |
| `SENTRY_AUTH_TOKEN` | Source-map upload at build time (optional locally) |

Clerk must be configured as a third-party auth provider in Supabase — the app never uses a service-role key, so every query is authorized by the caller's Clerk JWT through RLS.

### Billing plans

Companion limits are read from Clerk billing:

- `pro` plan — unlimited companions
- `10_active_companions` feature — 10
- `3_active_companions` feature — 3
- otherwise — 0 (the builder shows an upgrade prompt)

## Scripts

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build; fails on type errors
npm start        # serve the production build
npm run lint     # eslint
npx tsc --noEmit # type check on its own
```

## Database

Two tables:

- `companions` — `id`, `author` (Clerk user id), `name`, `subject`, `topic`, `voice`, `style`, `duration`, `created_at`
- `session_history` — `id`, `companion_id` → `companions.id`, `user_id` (Clerk user id), `created_at`

RLS policies should compare the Clerk user id in the JWT against `author` / `user_id`.

## Project layout

```
app/                     routes (App Router)
  companions/            library, builder, live session
  my-journey/            the signed-in user's companions and history
components/              feature components
  ui/                    shadcn primitives (base-ui)
lib/
  actions/               'use server' data access — the only place Supabase is queried
  supabase.ts            per-request client authenticated with the Clerk token
  vapi.sdk.ts            Vapi browser client
  utils.ts               cn(), subject colours, Vapi assistant config
constants/               subjects, subject colours, voice ids, soundwave animation
types/                   global ambient types (no imports needed)
proxy.ts                 Clerk middleware (Next 16 renamed middleware.ts → proxy.ts)
```
