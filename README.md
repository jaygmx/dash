# Dash

A handmade, card-catalogue dashboard for the bookmarks worth keeping — an index of
elsewhere. Next.js (App Router) on Vercel, ported from the Astro/Cloudflare original.

**Live:** [dash.brevy.dev](https://dash.brevy.dev)

Read-only by default — anyone can browse, search, filter, and open links. Unlock with a
passcode to file, edit, favorite, and delete cards; manage drawers; and change the cloud-
synced palette + type. Sessions are short-lived HMAC bearer tokens (60 min).

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run check    # tsc --noEmit
npm test         # vitest (auth, normalizers, meta UA guard)
```

Local dev needs `.env.local` (see **Environment**). Edit mode and cloud sync work locally
against the same Cloudflare KV store the production app uses.

## Architecture

- **App Router.** `app/layout.tsx` sets metadata + a pre-paint no-flash theme/appearance
  script; `app/page.tsx` renders the single client island `src/components/Dashboard.tsx`,
  which owns all state (local cache → cloud refresh → 800 ms debounced push), search,
  filters, dialogs, and keyboard shortcuts.
- **Hero.** `src/components/HeroMark.tsx` — a fully animated SVG card-catalogue scene
  (cards filing up, a "FILED" stamp, punch-holes, a self-drawing accent em-dash). All
  colors come from the theme CSS variables, so it adapts across all five palettes and
  light/dark; motion collapses to a still frame under `prefers-reduced-motion`.
- **API** (`app/api/*/route.ts`, Node runtime): `auth` (passcode → token), `bookmarks`
  (public GET / token PUT,DELETE), `drawers` + `appearance` (public GET / token PUT),
  `meta` (token-gated URL metadata fetch — robots.txt aware, og/twitter image inlining,
  JSON-LD keywords, parsed with `htmlparser2`).
- **Storage.** `src/lib/server/kv.ts` is a thin adapter over the **Cloudflare KV REST API**
  (`get`/`put`/`del`), reusing the original `BOOKMARKS_KV` namespace. Keys: `bookmarks:
  default`, `drawers:default`, `appearance:default`, stored as JSON strings. Swap stores by
  editing only this file.
- **Auth.** `src/lib/server/auth.ts` — stateless HMAC-SHA256 tokens `<expiry>.<hexHmac>`,
  verified purely cryptographically (never persisted); constant-time `safeEqual`.

## Environment

All server-only — never exposed to the client bundle. Set in `.env.local` for dev and in
the Vercel project for production.

| Variable | Purpose |
| --- | --- |
| `EDIT_PASSCODE` | Passcode exchanged at `/api/auth` for a session token. |
| `AUTH_SECRET` | HMAC key signing session tokens. Rotate to invalidate all sessions. |
| `CF_ACCOUNT_ID` | Cloudflare account holding the KV namespace. |
| `CF_KV_NAMESPACE_ID` | The `BOOKMARKS_KV` namespace id. |
| `CF_KV_API_TOKEN` | Cloudflare API token with Workers KV read/write. |

## Deploy

GitHub repo → Vercel Git integration; pushing `main` deploys to production at
`dash.brevy.dev` (DNS: a `dash` CNAME in the Cloudflare `brevy.dev` zone → Vercel).
Production env lives only in the Vercel project (`.env*` is excluded by `.vercelignore`).
Manual deploy fallback: `vercel --prod`.
