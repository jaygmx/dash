# Dash

A handmade, card-catalogue dashboard for the bookmarks worth keeping — an index of
elsewhere. Next.js (App Router) on Vercel, ported from the Astro/Cloudflare original.

**Live:** [dash.brevy.dev](https://dash.brevy.dev)

Private — the whole site sits behind a login wall (NextAuth: GitHub, Google, or an
email + password). Once signed in you can browse, search, file, edit, favorite, and delete
cards; manage drawers; and change the cloud-synced palette + type. Sessions are JWTs.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run check    # tsc --noEmit
npm test         # vitest (allowlist, normalizers, meta UA guard)
```

Local dev needs `.env.local` (see **Environment**). The site is login-gated; sign-in and
cloud sync work locally against the same Upstash Redis store the production app uses.

## Architecture

- **App Router.** `app/layout.tsx` sets metadata + a pre-paint no-flash theme/appearance
  script; `app/page.tsx` renders the single client island `src/components/Dashboard.tsx`,
  which owns all state (local cache → cloud refresh → 800 ms debounced push), search,
  filters, dialogs, and keyboard shortcuts.
- **Hero.** `src/components/HeroMark.tsx` — a fully animated SVG card-catalogue scene
  (cards filing up, a "FILED" stamp, punch-holes, a self-drawing accent em-dash). All
  colors come from the theme CSS variables, so it adapts across all five palettes and
  light/dark; motion collapses to a still frame under `prefers-reduced-motion`.
- **API** (`app/api/*/route.ts`, Node runtime): `auth/[...nextauth]` (NextAuth),
  `bookmarks`, `drawers`, `appearance`, `meta` (URL metadata fetch — robots.txt aware,
  og/twitter image inlining, JSON-LD keywords, parsed with `htmlparser2`). Every data route
  requires the owner session (401 otherwise).
- **Storage.** `src/lib/server/kv.ts` is a thin adapter over **Upstash Redis**
  (`get`/`put`/`del`). Keys: `bookmarks:default`, `drawers:default`, `appearance:default`,
  stored as JSON strings. Swap stores by editing only this file.
- **Auth.** NextAuth v5 (`src/lib/server/nextauth.ts`) — JWT sessions, no DB. GitHub +
  Google OAuth (gated by an email allowlist) and an email/password Credentials provider;
  `middleware.ts` gates the whole site, and `app/login` is the only public page — its
  particle-field backdrop is ported from `../jaunt`.

## Environment

All server-only — never exposed to the client bundle. Set in `.env.local` for dev and in
the Vercel project for production.

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | NextAuth JWT signing key. Rotate to invalidate all sessions. |
| `AUTH_OWNER_EMAIL` | The owner's email for the credentials (email/password) login. |
| `AUTH_PASSWORD_HASH` | bcrypt hash of the owner password (escape `$` as `\$` in `.env.local`; paste raw in Vercel). Optional if `EDIT_PASSCODE` is set. |
| `EDIT_PASSCODE` | Fallback owner password (constant-time compared) if no `AUTH_PASSWORD_HASH`. |
| `AUTH_ALLOWED_EMAILS` | Comma-separated allowlist gating GitHub/Google sign-in. Empty = nobody. |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Optional GitHub OAuth app — lights up the button. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google OAuth app — lights up the button. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis store (injected by the Vercel Upstash integration). |
| `CF_*` (account / namespace / token) | Migration-only — used by `scripts/migrate-kv.mjs` to copy old Cloudflare KV data; unused at runtime. |

## Deploy

GitHub repo → Vercel Git integration; pushing `main` deploys to production at
`dash.brevy.dev` (DNS: a `dash` CNAME in the Cloudflare `brevy.dev` zone → Vercel).
Production env lives only in the Vercel project (`.env*` is excluded by `.vercelignore`).
Manual deploy fallback: `vercel --prod`.
