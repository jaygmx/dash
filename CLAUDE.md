# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`dash` is a **port-in-progress**, not yet a built app. The workspace currently contains
only the porting brief — there is no `package.json`, source, or git repo yet. The job is
to recreate the live `../jug` site (Astro 5 + React 18 on Cloudflare Pages/KV) as a
**Next.js App Router app deployable on Vercel**, with full visual and functional parity.

**The canonical spec is [`dash-port.claude.instructions.md`](./dash-port.claude.instructions.md).**
It is authoritative and far more detailed than this file — read it before doing any porting
work. It defines the target architecture, the full requirement list, constraints, the
quality bar, and verification steps. This CLAUDE.md only orients you and records facts that
require reading across the source tree to assemble. When the two disagree, the instructions
file wins; keep both in sync if you change direction.

Two product decisions are still **open** (do not assume — ask the user): whether visible
copy stays "Jay's Catalogue" or is rebranded to "dash", and whether production data is
migrated from Cloudflare KV or `dash` starts from presets + empty cloud store.

## Source app being ported (`../jug`)

`../jug` is the source of truth for behavior — **inspect it directly, not just its README**
(the README lags the implementation; features like cover images, metadata autofill,
cloud-synced appearance, and editable drawers are newer). It is a separate git repo.

- **Stack:** Astro 5, React 18, Tailwind 3, Radix (Dialog/Label/Slot), lucide-react, CVA,
  clsx, tailwind-merge, tailwindcss-animate. Cloudflare Pages Functions + Cloudflare KV.
- **UI shell** is a single client island: `src/components/Dashboard.tsx` holds the state
  machine (local cache → cloud refresh → 800ms-debounced push), search, filters, dialogs,
  and keyboard shortcuts. `src/pages/index.astro` + `src/layouts/Layout.astro` render the
  shell and a pre-paint no-flash theme/appearance script.
- **Domain libs** (`src/lib/`): `types.ts` (the `Bookmark` shape), `drawers.ts` (dynamic
  categories — slug/code derivation, validation, max 32, delete-blocked-when-non-empty),
  `appearance.ts` (5 palettes × 5 font pairs, `normalizeAppearance`), `presets.ts`
  (`withPresets` merge), `storage.ts` (localStorage cache + normalization helpers),
  `cloud.ts` (client fetch layer + `CloudUnavailableError`/`CloudUnauthorizedError`).
- **Backend** (`functions/`): Pages Functions mapping 1:1 to `/api/{auth,bookmarks,drawers,
  appearance,meta}`. `functions/_lib/auth.ts` holds the shared HMAC token helpers.

### Data & API contracts to preserve exactly

- **KV keys → Redis keys (unchanged):** `bookmarks:default`, `drawers:default`,
  `appearance:default`. Store **JSON strings** (parity with KV + the `djb2` version hash).
- **API paths unchanged:** `/api/auth` (POST), `/api/bookmarks` (GET public / PUT,DELETE
  token-gated; returns `{ bookmarks, version }`), `/api/drawers` (GET/PUT), `/api/appearance`
  (GET/PUT), `/api/meta` (POST, token-gated).
- **localStorage keys unchanged** (preserves session/cache continuity across the migration),
  e.g. the cloud token lives at `jay.portal.cloud-token.v1`. Renaming requires a one-time
  migration shim.
- **Auth model (security boundary — keep byte-identical):** passcode (`EDIT_PASSCODE`) is
  exchanged at `/api/auth` for a stateless bearer token of shape `<expiryMillis>.<hexHmac>`,
  HMAC-SHA256 over the expiry string keyed by `AUTH_SECRET`, 60-minute TTL. Tokens are
  **never persisted server-side** — `verifyToken` is purely cryptographic, and `safeEqual`
  is constant-time. Reads are public; all writes require a valid token.
- **Payload limits (≥ source):** bookmarks JSON ≤ 2 MB, inlined cover image ≤ 100 KB,
  drawers ≤ 32.

## Porting gotchas (Cloudflare → Vercel)

- **Storage:** Cloudflare KV → **Upstash Redis** (`@upstash/redis`, `Redis.fromEnv()`).
  Put it in a **server-only** module (e.g. `src/lib/server/kv.ts`). Normalize parsed values
  defensively — the Redis client may auto-deserialize JSON depending on how it was written.
- **HTML parsing:** the `/api/meta` endpoint uses Cloudflare `HTMLRewriter`, which does not
  exist on Vercel. Replace with a Node-compatible parser (`htmlparser2` or similar) while
  preserving robots.txt handling, entity decoding, JSON-LD keyword extraction, cover
  inlining, timeouts, and error messages.
- **Secrets must never reach the client bundle:** `EDIT_PASSCODE`, `AUTH_SECRET`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Keep arbitrary-URL metadata fetching
  server-side and token-gated. Mark interactive React files `"use client"` and keep
  server-only code out of them.
- **Covers use plain `<img>`, not `next/image`** — covers can be arbitrary remote URLs or
  `data:image/...` URIs.
- **Security headers** from the source `public/_headers` must be reproduced via
  `next.config.ts` `headers()` (or `vercel.json`): `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`,
  long-immutable caching for static assets, 1-week favicon caching.

## Commands

Target `dash` scripts (to be created during scaffolding; verify against the generated
`package.json`):

```bash
npm install
npm run dev      # Next dev server (localhost:3000)
npm run lint
npm run build    # must succeed — part of the quality bar
npm run start
```

Local dev needs `.env.local` with `EDIT_PASSCODE`, `AUTH_SECRET`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`.

For reference, the **source** `../jug` runs on Astro: `npm run dev` (port 4444),
`npm run build` (`astro build` → `./dist`), `npm run preview:cf` (Cloudflare Functions
runtime, needs `.dev.vars`), `npm run deploy` (build + `wrangler pages deploy ./dist`).
