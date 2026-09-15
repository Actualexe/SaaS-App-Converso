# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build — fails on type errors
npm start        # next start
npm run lint     # eslint (flat config, eslint-config-next)
npx tsc --noEmit # type check alone; faster than a full build
```

There is no test suite in this repo. Verify changes with `npx tsc --noEmit`, `npm run lint`, and a dev-server smoke test of the affected routes.

`skipLibCheck: true` means **type errors inside `types/*.d.ts` are never reported**. Those files are ambient and unimported, so a broken declaration there fails silently at the use site instead — check them by hand when a shared type misbehaves.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Clerk (auth + billing) · Supabase (Postgres) · Vapi (realtime voice) · Sentry.

Next 16 conventions differ from older App Router code — notably `middleware.ts` is now [proxy.ts](proxy.ts), and route `params`/`searchParams` are Promises that must be awaited. Consult `node_modules/next/dist/docs/` as AGENTS.md instructs.

## Architecture

Converso is a real-time AI tutoring app. A "companion" is a configured AI tutor (name, subject, topic, voice, style, duration); starting a session opens a live voice call with it in the browser.

**Auth → DB is a single identity chain.** Clerk is the only identity source; there is no users table. [proxy.ts](proxy.ts) runs `clerkMiddleware()`, and [lib/supabase.ts](lib/supabase.ts) builds a per-request Supabase client whose `accessToken()` returns the Clerk session token. Supabase RLS therefore authorizes off the Clerk JWT — never swap in a service-role key or the security model collapses. Ownership is stored as the Clerk `userId` in `companions.author` and `session_history.user_id`.

**All data access goes through [lib/actions/companion.actions.ts](lib/actions/companion.actions.ts)** — a `'use server'` module that is the only place Supabase is queried. Two tables: `companions` and `session_history` (join rows of `companion_id` + `user_id`, read back with the `companions:companion_id (*)` join). Add new queries here rather than calling Supabase from pages or components.

**Billing gates creation, not access.** `newCompanionPermissions()` uses Clerk's `has({ plan })` / `has({ feature })` to resolve a companion cap (`pro` = unlimited, else the `10_active_companions` / `3_active_companions` features, checked largest-first so a plan carrying both is not capped at the smaller one), counts the user's rows with a `head: true` exact count, and returns a boolean. [app/companions/new/page.tsx](app/companions/new/page.tsx) renders either the builder form or an upgrade prompt from it; [app/subscription/page.tsx](app/subscription/page.tsx) is Clerk's `<PricingTable />`.

**The voice session is entirely client-side.** [components/CompanionComponent.tsx](components/CompanionComponent.tsx) is the one stateful client component: it drives a `CallStatus` state machine and subscribes to the Vapi singleton's events (`call-start`, `call-end`, `message`, `speech-start/end`, `error`), building the transcript from `transcript`/`final` messages. The assistant itself is assembled in `configureAssistant()` in [lib/utils.ts](lib/utils.ts) — Deepgram transcriber, 11Labs voice (id looked up from the `voices` map in [constants/index.ts](constants/index.ts) by voice+style), OpenAI model, with `{{topic}}` / `{{subject}}` / `{{style}}` filled at call time via `assistantOverrides.variableValues`. Only `addToSessionHistory()` touches the server, on call end.

## Conventions

- Pages are async server components that `await auth()` / `currentUser()` and `redirect('/sign-in')` when unauthenticated; only components needing browser APIs or Vapi are `'use client'`.
- Shared types are **global ambient declarations** in [types/index.d.ts](types/index.d.ts) — they are used without imports. Add new shared interfaces there, not as exported types.
- Subjects are a closed set defined in [constants/index.ts](constants/index.ts) (`subjects`, `subjectsColors`) and must line up with the icons in `public/icons/<subject>.svg`; adding a subject means touching all three.
- shadcn components in [components/ui/](components/ui/) use the `base-nova` style and are built on **`@base-ui/react`**, not Radix (Radix survives only in `label`/`slot`). Match that when adding components; config is [components.json](components.json).
- Layout classes (`.companion-section`, `.btn-primary`, `.transcript`, …) live in the `@layer components` block of [app/globals.css](app/globals.css), alongside the Tailwind v4 `@theme inline` tokens. Reuse them instead of re-inlining the same utility strings.
- Forms use react-hook-form + zod + shadcn `<Form>` and submit directly to a server action ([components/CompanionForm.tsx](components/CompanionForm.tsx)). Navigate afterwards with `useRouter().push`, not `redirect()` — react-hook-form's `handleSubmit` swallows the `NEXT_REDIRECT` throw.
- The Vapi SDK's generated types declare `clientMessages` / `serverMessages` as a single string literal, but the API takes an **array**. Casting at that one field is expected; see [components/CompanionComponent.tsx](components/CompanionComponent.tsx).
- `lottie-react` v3 takes `src` + `lottieRef`, not v2's `animationData`.
- Every read in the actions layer returns `[]` or `null` rather than `undefined`, so pages can render an empty state instead of crashing on `.map` / destructuring.

## Environment

Copy [.env.example](.env.example) to `.env.local`. It supplies: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, the four `NEXT_PUBLIC_CLERK_SIGN_{IN,UP}_*` URLs, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPI_WEB_TOKEN`, `SENTRY_AUTH_TOKEN`.

Sentry is wired through [instrumentation.ts](instrumentation.ts), [instrumentation-client.ts](instrumentation-client.ts), `sentry.server.config.ts`, `sentry.edge.config.ts`, [app/global-error.tsx](app/global-error.tsx) and `withSentryConfig` in [next.config.ts](next.config.ts). A Sentry MCP server for this project is configured in [.mcp.json](.mcp.json). `app/sentry-example-page/` and `app/api/sentry-example-api/` are generated scaffolding, not product code.
