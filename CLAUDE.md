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

Dev + edit mode need `.env.local` (see **Environment**). They work against the same live
Cloudflare KV the production site uses, so local edits write to real cloud state.

## Architecture (big picture)

- **One client island.** `app/page.tsx` (server) renders `src/components/Dashboard.tsx`
  (`"use client"`) — the only component that needs the directive; its whole subtree is
  client. Dashboard owns all state: local cache → cloud refresh → **800 ms debounced**
  bookmark push, search, filters, dialogs, and keyboard shortcuts.
- **No-flash theming.** `app/layout.tsx` injects an inline pre-paint script that reads
  `localStorage` (`jay.portal.*` keys — kept from the source for session continuity) and
  sets `dark` class + `data-theme`/`data-font` before first paint. Five palettes × five
  font pairs are pure CSS-variable swaps in `app/globals.css`.
- **Animated hero.** `src/components/HeroMark.tsx` — an SVG card-catalogue scene (cards
  filing up, "FILED" stamp, punch-holes, a self-drawing accent em-dash = the "Dash" mark).
  Every fill/stroke is `hsl(var(--…))`, so it tracks the active palette + light/dark; all
  motion collapses to a still frame under `prefers-reduced-motion`. Sits in a band between
  the masthead and the card grid (compact — the catalogue is still the first screen).
- **API** (`app/api/*/route.ts`, **Node runtime**): `auth` (passcode→token, POST only),
  `bookmarks` (public GET / token PUT,DELETE; `{bookmarks, version}` via djb2),
  `drawers` + `appearance` (public GET / token PUT), `meta` (token-gated URL metadata —
  robots.txt aware, og/twitter image inlining, JSON-LD keywords).
- **Storage** (`src/lib/server/kv.ts`): thin adapter over the **Cloudflare KV REST API**
  (`kvGet`/`kvPut`/`kvDel`), reusing the original `BOOKMARKS_KV` namespace. Keys
  `bookmarks:default`, `drawers:default`, `appearance:default`, stored as JSON strings.
  **To change stores, edit only this file.**
- **Auth** (`src/lib/server/auth.ts`): stateless HMAC-SHA256 tokens `<expiry>.<hexHmac>`,
  60-min TTL, verified purely cryptographically (never persisted); constant-time `safeEqual`.
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
- **Brand = "Dash"**; "catalogue" survives only as a common noun (the library-card metaphor).
- **Secrets are server-only** and excluded from Vercel uploads by `.vercelignore`. Never
  import `src/lib/server/*` into a client component.
- Tailwind **v3** (matches the source CSS directives + `tailwind.config.mjs`), not v4.

## Environment (all server-only)

`EDIT_PASSCODE`, `AUTH_SECRET`, `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_KV_API_TOKEN`.
Set in `.env.local` for dev and in the Vercel project for production. The CF token currently
deployed is a broad account token — **rotating it to a KV-scoped token is a known follow-up**
(account lacked the API-token-create permission at deploy time).
