# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

ContentFlow is a personal content-production planner (see `PRD_ContentFlow.md`): the user dumps content ideas, adds personal appointments, and the app decides what to record each day. UI, copy, code comments and commit messages are in **Portuguese (pt-BR)**; keep it that way.

## Commands

```bash
pnpm dev                                         # dev server (needs .env.local, see .env.example)
pnpm build                                       # production build (output: "standalone")
pnpm lint                                        # ESLint (includes React Compiler rules, e.g. no setState in effects)
pnpm test                                        # Vitest, all tests
pnpm vitest run src/lib/planner.test.ts          # one file
pnpm vitest run -t "respeita compromissos"       # one test by name
npx tsc --noEmit                                 # typecheck
```

`pnpm build` without real Supabase env works if you pass placeholders (`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy`), since all app pages are dynamic.

## Architecture

Stack: Next.js 16 App Router + React 19, Supabase (Postgres + Auth via `@supabase/ssr`), Tailwind CSS 4, PWA (`app/manifest.ts`, generated icons). No client-side Supabase client: all reads happen in Server Components and all writes in Server Actions.

- **`src/lib/` holds the pure domain logic** and is where the tests live. Keep it free of Next/Supabase imports (except `data.ts` and `supabase/`).
  - `planner.ts`: `buildPlan()` is the heart of the product. Given contents, personal events and per-weekday recording windows, it returns day-by-day recording sessions with start/end times, plus alerts. Rules: only statuses in `NEEDS_RECORDING` are scheduled; recording deadline = publication date − 1 day (stories: same day); urgency order = deadline, then priority, then creation; day preference = Saturday → weekdays → Sunday; same-format items are batched on the same day; a manually set `recording_date` pins the item. Free time = recording window minus events (`freeSlots`). The plan is **recomputed on every request and never persisted**. It also hosts event recurrence (`occursOn`) and the overlap check for events (`findConflict`).
  - `parse-ideas.ts`: turns pasted text into ideas. It handles one idea per line (`Reels — título 05/10`) and table rows split by `|` or tab (title / format / date / extra columns go to `notes`). A `null` format means the UI must ask the user.
  - `dates.ts`: dates are local `"YYYY-MM-DD"` strings and times are minutes since midnight. "Today" comes from the profile timezone (`todayIn`). Avoid `Date` arithmetic elsewhere.
  - `domain.ts`: enums mirrored from Postgres (formats, the 8-step status pipeline, priorities, recurrences), pt-BR labels, default durations, shared types.
  - `data.ts` (`server-only`): `React.cache`d loaders (`getSession`, `getProfile`, `getContents`, `getEvents`, `getPlan`, `getToday`). `getSession` redirects to `/login` when there is no user.
- **`src/app/actions.ts`**: every mutation, as Server Actions. Each one validates input itself, then calls `revalidatePath("/", "layout")`.
- **Routing**: `src/app/(app)/` is the authenticated shell (sidebar on desktop, bottom nav + global quick-add dialog on mobile). `/` is the "Hoje" (today) screen. `src/proxy.ts` (Next 16's renamed middleware) refreshes the Supabase session and redirects anonymous users to `/login`.
- **Ideas vs contents**: there is no separate ideas table. The idea bank is `contents` with `status = 'ideia'`, and "Transformar em conteúdo" moves it to `planejado`.
- **Styling**: design tokens (`ink`, `paper`, `mist`, `rose*`, `alert`, `ok`) and reusable classes (`card`, `btn-*`, `field`, `label`, `chip`, `eyebrow`) are defined as Tailwind v4 `@theme` / `@utility` in `src/app/globals.css`. Palette is black/white with a restrained rosé accent; display font Fraunces, body font Inter.

## Database

- Schema lives in `supabase/migrations/*.sql`. There is no Supabase CLI link: the user applies each new migration by pasting it into the Supabase SQL Editor. So schema changes go in a **new** migration file, and you must tell the user to run it; code that depends on a new column fails until they do.
- Every table has `user_id default auth.uid()` plus an RLS policy `user_id = auth.uid()`. Inserts don't send `user_id`.
- `profiles.recording_windows` is JSONB keyed by weekday `"0"`(Sun)…`"6"`(Sat). `personal_events` stores local `date` + `time` values (no timezone) plus a `recurrence` enum; `weekdays smallint[]` is used when the recurrence is `dias_semana`.

## Deploy

Pushing to `main` triggers `.github/workflows/docker.yml`: lint and tests run, then the workflow builds and publishes `ghcr.io/lulialmeidaa/contentflow:latest`. `NEXT_PUBLIC_*` values come from GitHub repo **Variables**, because they are baked in at build time.

The app runs on a shared Hostinger VPS via `docker-compose.yml`. The container joins the external network `financas_financas` so that the existing Cloudflare Tunnel serves `contentflow.necohouse.com.br` → `http://contentflow:3000`. To update the VPS, run `./deploy.sh` there.

The same VPS runs other people's production systems (vidrasystem, financas, evolution-api). Never change or restart them, and keep ContentFlow self-contained in its own compose project.
