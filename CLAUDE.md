# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Dash** — a handmade, card-catalogue dashboard for bookmarks ("an index of elsewhere").
Next.js 15 App Router + React 18 on Vercel, ported from the Astro 5 / Cloudflare original
at `../jug`. **Live: https://dash.brevy.dev** · repo: `github.com/jaygmx/dash` (pushing
`main` auto-deploys via Vercel's Git integration).

The full port spec + the rebrand/hero/storage decisions live in
[`dash-port.claude.instructions.md`](./dash-port.claude.instructions.md) — read it for the
"why" behind anything non-obvious. `../jug` remains the behavioral reference (read it
directly; its README lags the implementation).

## Commands

```bash
npm run dev      # http://localhost:3000
npm run build    # production build (TypeScript errors fail it; ESLint is not a build gate)
npm run start
npm run check    # tsc --noEmit
npm test         # vitest — auth, normalizers, + the ASCII User-Agent guard
```

The whole site sits behind a login wall (NextAuth). Dev needs `.env.local` (see
**Environment**) — the auth vars to sign in, plus the Upstash creds to load/save data,
which is Vercel-hosted Upstash Redis (local edits write to real cloud state).

## Architecture (big picture)

- **One client island.** `app/page.tsx` (server) checks the NextAuth session (redirects to
  `/login` if absent) then renders `src/components/Dashboard.tsx` (`"use client"`) — the
  only component that needs the directive; its whole subtree is client. Dashboard owns all
  state: local cache → cloud refresh → **800 ms debounced** bookmark push, search, filters,
  dialogs, and keyboard shortcuts. Signed in ⇒ owner ⇒ always editable (no read-only mode);
  the masthead has a **Sign out** control.
- **No-flash theming.** `app/layout.tsx` injects an inline pre-paint script that reads
  `localStorage` (`jay.portal.*` keys — kept from the source for session continuity) and
  sets `dark` class + `data-theme`/`data-font` before first paint. Five palettes × five
  font pairs are pure CSS-variable swaps in `app/globals.css`.
- **Animated hero.** `src/components/HeroMark.tsx` — an SVG card-catalogue scene (cards
  filing up, "FILED" stamp, punch-holes, a self-drawing accent em-dash = the "Dash" mark).
  Every fill/stroke is `hsl(var(--…))`, so it tracks the active palette + light/dark; all
  motion collapses to a still frame under `prefers-reduced-motion`. Sits in a band between
  the masthead and the card grid (compact — the catalogue is still the first screen).
- **API** (`app/api/*/route.ts`, **Node runtime**): `auth/[...nextauth]` (NextAuth handler),
  `bookmarks` (`{bookmarks, version}` via djb2), `drawers`, `appearance`, `meta` (URL
  metadata — robots.txt aware, og/twitter image inlining, JSON-LD keywords). Every data
  route calls `requireOwner()` (NextAuth session) and 401s without it — no public read.
- **Storage** (`src/lib/server/kv.ts`): thin adapter over **Upstash Redis** (`@upstash/redis`,
  `automaticDeserialization:false` for raw-string parity), `kvGet`/`kvPut`/`kvDel`. Keys
  `bookmarks:default`, `drawers:default`, `appearance:default`, stored as JSON strings.
  **To change stores, edit only this file.** (Moved off Cloudflare KV via
  `scripts/migrate-kv.mjs` — a one-shot CF→Upstash copy.)
- **Auth** (NextAuth v5 — `src/lib/server/nextauth.ts` + edge-safe `auth.config.ts`): JWT
  sessions, no DB. Three providers, each conditional on its env: Credentials (owner email +
  bcrypt `AUTH_PASSWORD_HASH`, or a constant-time `EDIT_PASSCODE` fallback), GitHub, Google
  — OAuth gated by the `AUTH_ALLOWED_EMAILS` allowlist (`src/lib/server/allowlist.ts`).
  `middleware.ts` redirects every unauthenticated page to `/login`. Login UI =
  `app/login/page.tsx` + `src/components/auth/` (the `ParticleField` canvas ported from
  `../jaunt` behind a backdrop-blurred `LoginCard`).
- **Pure libs** (`src/lib/*.ts`): `types`, `drawers`, `appearance`, `presets`, `storage`,
  `cloud` (client fetch layer) — ported verbatim from `../jug`, behavior unchanged.

## Conventions / gotchas

- **`@/*` → `src/*`** (tsconfig). App Router files live in `app/`; everything else in `src/`.
- **HTTP header values must be ASCII** (Latin-1). `app/api/meta/route.ts`'s `USER_AGENT`
  once contained an em-dash → Node/undici `fetch` threw "Cannot convert argument to a
  ByteString" (Cloudflare Workers tolerated it). Guarded by a unit test in
  `src/lib/units.test.ts` — keep that line ASCII.
- **Covers use plain `<img>`**, never `next/image` — they can be arbitrary remote URLs or
  `data:` URIs.
- **The whole site is gated.** `middleware.ts` (NextAuth, edge-safe `auth.config.ts`)
  bounces unauthenticated requests to `/login`; `app/page.tsx` re-checks server-side. Being
  signed in is the only capability — `canEdit` is hard-`true` in `Dashboard.tsx`.
- **A bcrypt hash in `.env.local` MUST escape `$`.** `@next/env` runs dotenv variable
  expansion, so `$2b$12$…` gets corrupted (`$2b`/`$12` read as empty vars) → `bcrypt.compare`
  silently fails. Escape each `$` as `\$` in `.env.local`; Vercel stores values literally, so
  paste the raw hash there. The `EDIT_PASSCODE` credentials fallback is partly insurance
  against a mangled hash. Generate one with `node scripts/hash-password.mjs`.
- **Brand = "Dash"**; "catalogue" survives only as a common noun (the library-card metaphor).
- **Secrets are server-only** and excluded from Vercel uploads by `.vercelignore`. Never
  import `src/lib/server/*` into a client component.
- Tailwind **v3** (matches the source CSS directives + `tailwind.config.mjs`), not v4.

## Environment (all server-only)

**Auth:** `AUTH_SECRET` (NextAuth JWT signing), `AUTH_OWNER_EMAIL`, and one of
`AUTH_PASSWORD_HASH` (bcrypt — escape `$` in `.env.local`) or `EDIT_PASSCODE` (fallback).
`AUTH_ALLOWED_EMAILS` (comma-sep) gates OAuth. Optional OAuth apps —
`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` — each pair
lights up its button; their callback URL is
`https://dash.brevy.dev/api/auth/callback/{github,google}`.

**Storage:** `KV_REST_API_URL` + `KV_REST_API_TOKEN` (injected by the Vercel Upstash
integration; `UPSTASH_REDIS_REST_URL`/`_TOKEN` are also accepted).

**Migration-only:** `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_KV_API_TOKEN` — used solely by
`scripts/migrate-kv.mjs` to copy the old Cloudflare KV data across; unused at runtime.

Set in `.env.local` for dev and in the Vercel project for production.
