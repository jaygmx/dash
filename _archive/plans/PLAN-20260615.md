# Dash — phased port plan

Port `../jug` (Astro 5 + Cloudflare Pages/KV) → Next.js App Router on Vercel, rebrand to
**Dash**, add an animated hero SVG, deploy to `dash.brevy.dev`. Canonical spec:
`dash-port.claude.instructions.md`. Use best judgment; no questions.

## Decisions (locked)
- **Storage:** Cloudflare KV via REST API behind `src/lib/server/kv.ts` (reuses existing
  `BOOKMARKS_KV`, zero provisioning). Env: `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`,
  `CF_KV_API_TOKEN`, plus `EDIT_PASSCODE`, `AUTH_SECRET`.
- **Rebrand:** brand → "Dash"; keep "catalogue" as common noun; keep `jay.portal.*`
  localStorage keys.
- **Hero:** animated SVG band atop catalogue content; CSS-var theme colors; card-filing +
  em-dash motif; reduced-motion safe.
- **Stack:** Next 16 (webpack, matches `plow`), React 19, Tailwind 3 (source uses v3 tokens),
  htmlparser2 for `/api/meta`, plain `<img>` for covers.

## Phases
- [ ] **P1 Scaffold** — package.json, tsconfig (`@/*`→`src/*`), next.config.ts (security
      headers from `_headers`), postcss, tailwind.config.mjs (copy), .gitignore,
      .vercelignore (exclude `.env*`), .nvmrc, .env.local. `npm install`.
- [ ] **P2 Styles + static** — copy `globals.css` (+ hero CSS, reduced-motion); Dash
      favicon.svg; app/globals.css import.
- [ ] **P3 Libs** — copy `src/lib/*` verbatim; add `src/lib/server/auth.ts` (port of
      `functions/_lib/auth.ts`) and `src/lib/server/kv.ts` (CF KV REST adapter).
- [ ] **P4 Components** — copy `src/components/**` verbatim; `"use client"` on Dashboard;
      rebrand strings; new `HeroMark.tsx`; wire hero into Dashboard.
- [ ] **P5 App Router** — `app/layout.tsx` (metadata + no-flash inline script),
      `app/page.tsx`, `app/api/{auth,bookmarks,drawers,appearance,meta}/route.ts`
      (meta uses htmlparser2; node runtime).
- [ ] **P6 Verify** — `npm run lint`, `tsc --noEmit`, `npm run build`; vitest units
      (auth sign/verify, normalizers); `npm run dev` + Playwright parity/hero/theme checks.
- [ ] **P7 Deploy** — git init; `gh repo create jaygmx/dash`; push; scoped CF KV token;
      `vercel link` + env + `vercel --prod`; add `dash.brevy.dev` (Vercel domain + CF CNAME);
      verify live 200 + edit flow.
