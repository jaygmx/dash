# Dash Next.js Port Instructions

## Target LLM
Claude. Use clearly delimited sections, explicit assumptions, concise ambiguity handling, and a final response that reports only completed work, verification, and remaining risks.

## Research Basis
Use these official or primary sources when implementing or refreshing stack decisions:

- Next.js App Router and Route Handlers: https://nextjs.org/docs/app and https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js root layout and Metadata API: https://nextjs.org/docs/app/api-reference/file-conventions/layout
- Next.js deployment options: https://nextjs.org/docs/pages/getting-started/deploying
- Vercel Next.js hosting: https://vercel.com/docs/frameworks/full-stack/nextjs
- Vercel Functions: https://vercel.com/docs/functions
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel project configuration: https://vercel.com/docs/project-configuration
- Vercel Storage overview and Marketplace storage: https://vercel.com/docs/storage and https://vercel.com/docs/marketplace-storage
- Upstash Redis TypeScript SDK: https://upstash.com/docs/redis/sdks/ts/overview
- Web Crypto HMAC primitives: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign and https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey

## Instruction Hierarchy
Follow system and developer instructions first, then this file, then user follow-up requests. Preserve the source site's user-visible behavior and visual design unless a higher-priority instruction or a platform incompatibility requires a change. If a platform incompatibility exists, document it before changing behavior.

## Role
Act as a senior frontend and full-stack migration engineer. Your task is to port the existing `../jug` site to a new Next.js application named `dash`, deployable on Vercel, with visual and functional parity.

## Suitable Agents And Skills
- `frontend-engineer`: inspect the Astro/React source, port components to Next.js App Router, preserve client-side behavior, and wire API calls.
- `front-end-ui-designer`: verify the card-catalogue aesthetic, responsive layouts, typography, animation, dialogs, and visual parity.
- `accessibility-specialist`: verify focus behavior, keyboard shortcuts, ARIA labels, dialogs, reduced motion, and contrast.
- `backend-api-engineer`: port Cloudflare Pages Functions to Next.js Route Handlers and replace Cloudflare KV with Vercel-compatible storage.
- `security-privacy-reviewer`: review passcode auth, HMAC bearer tokens, environment variables, metadata fetching, and arbitrary URL fetch safety.
- `qa-test-engineer`: create parity tests and run browser verification across desktop and mobile.
- `devops-release-engineer`: configure Vercel deployment, environment variables, storage integration, headers, and production checks.

## Objective
Create a Next.js version of `../jug` in the current `dash` project that can be published on Vercel without losing features. Preserve the source site's visual appearance, interactions, data model, APIs, sync behavior, auth model, keyboard shortcuts, accessibility affordances, and responsive behavior. Rename the new project/deployment to `dash`.

## Rebrand (decided 2026-06-15)
- The visible product name is **Dash** (not "Jay's Catalogue"). Apply the new name to the
  masthead wordmark, the `<title>`/metadata, dialog subtitles (`… · Dash`), the ticker, the
  imprint blurb, and the metadata-bot User-Agent. **Keep "catalogue" where it is used as a
  common noun** for the card-catalogue metaphor (e.g. "Query the catalogue…", "End of
  catalogue") — that is the design language, not the brand.
- Keep the source `localStorage` keys (`jay.portal.*`) unchanged — invisible to users and
  preserves cached sessions; renaming buys nothing.
- KV data migration is **not required** (the source store is near-empty).

## Animated hero (decided 2026-06-15)
Add a **fully animated hero SVG** somewhere in the site (a hero band at the top of the
catalogue content, below the masthead ticker — present but compact, so the card grid is
still the first screen, not a landing page). Requirements:
- Animation must **fit the purpose**: a hand-filed card catalogue / "index of elsewhere".
  Motifs: index cards filing into a drawer, a classification stamp landing, punch-hole row,
  and an animated em-dash (—) stroke that doubles as the "Dash" wordmark accent.
- Use **theme colors via CSS variables** (`hsl(var(--paper))`, `--ink`, `--accent`,
  `--stamp`, `--card`) so it adapts across all five palettes and light/dark automatically.
- Honor `prefers-reduced-motion` (freeze to a composed final frame).

## Source Context
The source app lives at `../jug` and is currently an Astro 5 + React 18 site with Cloudflare Pages Functions and Cloudflare KV.

Key source files to inspect before editing:

- `../jug/README.md`
- `../jug/package.json`
- `../jug/src/pages/index.astro`
- `../jug/src/layouts/Layout.astro`
- `../jug/src/styles/globals.css`
- `../jug/tailwind.config.mjs`
- `../jug/src/components/Dashboard.tsx`
- `../jug/src/components/BookmarkCard.tsx`
- `../jug/src/components/BookmarkForm.tsx`
- `../jug/src/components/AppearanceDialog.tsx`
- `../jug/src/components/DrawersDialog.tsx`
- `../jug/src/components/*`
- `../jug/src/components/ui/*`
- `../jug/src/lib/types.ts`
- `../jug/src/lib/storage.ts`
- `../jug/src/lib/cloud.ts`
- `../jug/src/lib/appearance.ts`
- `../jug/src/lib/drawers.ts`
- `../jug/src/lib/presets.ts`
- `../jug/functions/_lib/auth.ts`
- `../jug/functions/api/auth.ts`
- `../jug/functions/api/bookmarks.ts`
- `../jug/functions/api/drawers.ts`
- `../jug/functions/api/appearance.ts`
- `../jug/functions/api/meta.ts`
- `../jug/public/favicon.svg`
- `../jug/public/_headers`

## Extracted Requirements
- Build a new Next.js app named `dash` in the current workspace.
- Use Next.js App Router, React, TypeScript, Tailwind, Radix Dialog/Label/Slot, lucide-react, class-variance-authority, clsx, tailwind-merge, and tailwindcss-animate unless source inspection shows a better exact dependency match.
- Preserve the card-catalogue UI exactly: cream paper/carbon ink/accent palettes, dark mode, paper grain, clipped cards, punch holes, stamps, masthead ticker, sticky header, live EST/EDT clock, drawer sidebar, mobile filters, responsive 1/2/3-column card grid, and footer colophon.
- Preserve all current feature behavior, including features that are newer than the README: cover images, metadata fetching, cloud-synced appearance, editable drawers, local fallback, and owner-only editing.
- Preserve read-only default mode. Visitors can browse/search/filter/open links without auth.
- Preserve edit mode gated by passcode. Passcode must never be bundled into client code.
- Preserve HMAC-signed bearer token sessions with 60-minute expiry and localStorage token persistence.
- Preserve public reads and authenticated writes for bookmarks, drawers, and appearance.
- Preserve localStorage cache fallback and no-flash light/dark/appearance application before first paint.
- Preserve preset bookmark merging without overwriting cloud state.
- Preserve last-write-wins sync semantics and the 800 ms debounced bookmark push.
- Preserve search across title, URL, description, tags, and category/drawer key.
- Preserve filters for all, favorites, drawers, and popular cross-reference tags.
- Preserve bookmark create/edit/delete/favorite behavior.
- Preserve URL normalization, hostname fallback titles, classification generation, date formatting, tag parsing, tag dedupe, and tag limits.
- Preserve metadata autofill when title and description are blank: fetch title, description, JSON-LD keywords, and `og:image`/Twitter image; respect robots.txt; enforce timeouts and image-size behavior.
- Preserve drawer management: built-in drawers, custom drawers, slug/code derivation, max drawer count, duplicate validation, and delete blocking when a drawer contains cards.
- Preserve appearance management: five palette keys and five font-pair keys, cloud-synced for all visitors while light/dark remains a per-visitor preference.
- Preserve keyboard shortcuts: `/` and `Cmd/Ctrl+K` focus search, `N` new card in edit mode, `F` favorites, number keys select drawers, `0` all, `T` theme, `?` help, `Esc` closes dialogs.
- Preserve accessibility: semantic landmarks, keyboard operability, focus rings, dialog semantics, ARIA labels, `aria-pressed`, reduced motion behavior, and responsive text fit.
- Preserve security/cache headers from `public/_headers` using Vercel/Next configuration.
- Deploy to Vercel as project `dash`.

## Assumptions
- The destination directory is the new `dash` workspace.
- The original Cloudflare KV namespace is not available on Vercel. Use Upstash Redis through Vercel Marketplace or explicit Upstash credentials as the closest Vercel-compatible key-value replacement.
- Store the same logical keys in Redis: `bookmarks:default`, `drawers:default`, and `appearance:default`.
- Keep the client API paths identical: `/api/auth`, `/api/bookmarks`, `/api/drawers`, `/api/appearance`, and `/api/meta`.
- Keep source localStorage keys unless the user asks to rename them; this preserves browser cache/session continuity during migration. If renaming is required, implement a one-time migration from old keys to new `dash` keys.
- Use plain `<img>` for bookmark covers, not `next/image`, because covers may be arbitrary remote URLs or `data:image/...` URIs.

## Output
Produce a complete Next.js application in the `dash` workspace with:

- `package.json` scripts: `dev`, `build`, `start`, `lint`, and a Vercel-friendly build path.
- App Router structure: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, and route handlers under `app/api/*/route.ts`.
- Components ported from `../jug/src/components`, with `"use client"` only where required.
- Shared libraries under `src/lib` or `lib`, preserving existing data contracts and helper behavior.
- UI primitives ported from `../jug/src/components/ui`.
- Static assets under `public`, including `favicon.svg`.
- Tailwind/PostCSS/TypeScript config equivalent to the source, adjusted for Next.js file globs.
- Storage client module for Upstash Redis or the chosen Vercel Marketplace storage.
- Auth helper module equivalent to `functions/_lib/auth.ts`.
- README or deployment notes for Vercel env vars and storage setup.
- Optional tests when feasible: unit tests for auth, storage normalization, drawer validation, and metadata parsing; Playwright or equivalent browser checks for parity.

## Constraints
- Do not drop features to simplify the port.
- Do not rewrite the product into a generic dashboard or marketing landing page.
- Do not expose `EDIT_PASSCODE`, `AUTH_SECRET`, or Redis credentials to client bundles.
- Do not introduce server-only packages into client components.
- Do not depend on Cloudflare-only APIs in Vercel runtime. Replace `HTMLRewriter` with a Node-compatible parser such as `htmlparser2` or another maintained HTML parser.
- Keep arbitrary URL metadata fetching server-side only and protected by the same bearer token auth.
- Keep payload size limits at least as strict as the source: bookmarks JSON max is 2 MB, cover inlining max is 100 KB, drawers max is 32.
- Use official docs for any Next.js/Vercel behavior that is uncertain or has changed recently.
- Preserve unrelated user changes if the workspace is not clean.

## Architecture Requirements
Use this target architecture:

- `app/page.tsx`: render the dashboard shell and import the client `Dashboard`.
- `app/layout.tsx`: define `<html>` and `<body>`, use Next Metadata API for title/description, include favicon metadata, and inject the no-flash theme/appearance script before paint using a safe inline script.
- `app/api/auth/route.ts`: `POST` only. Validate `{ passcode }` against `process.env.EDIT_PASSCODE`, sign token with `process.env.AUTH_SECRET`, return `{ token, expiry }`, and return 405 for other methods.
- `app/api/bookmarks/route.ts`: `GET`, `PUT`, `DELETE`. Public `GET`; token-gated mutations. Store the raw bookmark array JSON at `bookmarks:default`. Return `{ bookmarks, version }` using the same `djb2` version hash.
- `app/api/drawers/route.ts`: `GET`, `PUT`. Public `GET`; token-gated `PUT`. Validate drawer keys, labels, codes, uniqueness, and count.
- `app/api/appearance/route.ts`: `GET`, `PUT`. Public `GET`; token-gated `PUT`. Validate theme/font keys.
- `app/api/meta/route.ts`: `POST` only. Token-gated. Validate URL, allow only HTTP(S), fetch and parse `robots.txt`, fetch upstream HTML/XML with timeout, parse head metadata, parse JSON-LD keywords, optionally inline small cover images, and return `{ title, description, tags, cover }`.
- `src/lib/cloud.ts`: keep client fetch functions and error classes but point to the same route paths.
- `src/lib/storage.ts`, `src/lib/drawers.ts`, `src/lib/appearance.ts`, `src/lib/types.ts`: preserve behavior and types; update imports only.
- `src/components/Dashboard.tsx`: client component. Preserve state machine, local cache, cloud refresh, debounced sync, dialogs, filters, search, shortcuts, and rendering.
- `src/components/BookmarkForm.tsx`: client component. Preserve metadata autofill and fallback behavior.
- CSS/Tailwind: copy source tokens, themes, font pairs, animations, utility classes, and component classes exactly unless Next/Tailwind requires path updates.

## Storage Strategy (decided 2026-06-15 — Cloudflare KV REST, not Upstash)
The original Upstash plan was dropped: provisioning Upstash needs an account API key that
isn't available here, whereas a working **Cloudflare API token** and the original
`BOOKMARKS_KV` namespace already exist. The Vercel Node runtime talks to that namespace over
the **Cloudflare KV REST API**, behind a server-only `src/lib/server/kv.ts` adapter that
exposes the same `get(key)` / `put(key, value)` / `del(key)` surface the source Pages
Functions used (`env.BOOKMARKS_KV.*`) — so the route handlers stay close to the source. The
adapter is swappable: a future move to Upstash only touches `kv.ts`.

Implementation guidance:

- `src/lib/server/kv.ts` calls `…/accounts/{CF_ACCOUNT_ID}/storage/kv/namespaces/{CF_KV_NAMESPACE_ID}/values/{key}`
  with `Authorization: Bearer ${CF_KV_API_TOKEN}`. GET returns raw text (or `null` on 404);
  PUT sends the value as the body; DELETE removes it.
- Store **JSON strings** (parity with the source + the `djb2` version hash).
- Use a **narrowly-scoped** CF token (Workers KV Storage:Edit), never the global token.
- Keep local development working with `.env.local`.

Required environment variables (server-only):

- `EDIT_PASSCODE`
- `AUTH_SECRET`
- `CF_ACCOUNT_ID`
- `CF_KV_NAMESPACE_ID`
- `CF_KV_API_TOKEN`

## Product And UX Direction
The first screen must be the actual catalogue app, not a landing page. Keep the existing density and editorial/library-card feel.

Visual parity checklist:

- Header remains sticky and paper-like with sync pill, shortcuts button, mode toggle, theme toggle, style button in edit mode, and new-entry button in edit mode.
- Ticker continues to scroll and include card count, favorite count, drawer count, mode, and shortcuts hint.
- Cards retain clipped corners, grain, cover area, classification number, holes, title typography, host link, tags, filed stamp, date, and drawer label.
- Desktop keeps sidebar drawer filters and cross-reference tags.
- Mobile uses compact filters and no overlapping header controls.
- Light/dark and all five appearance themes render correctly.
- All five font pairs apply through CSS variables.
- Dialogs retain sizing, labels, button styles, validation messages, and pending states.

## Process
1. Inspect `../jug` completely before editing. Do not rely only on the README because it is behind the current implementation.
2. Scaffold the Next.js app in the current `dash` workspace using TypeScript and App Router.
3. Copy and adapt Tailwind, PostCSS, global CSS, static assets, UI primitives, and component files.
4. Convert Astro layout/page behavior into `app/layout.tsx` and `app/page.tsx`.
5. Mark interactive React files with `"use client"` and keep server-only code out of those modules.
6. Port Cloudflare Pages Functions into Next.js Route Handlers with matching request/response shapes and status codes.
7. Replace Cloudflare KV access with the storage abstraction; keep key names and JSON shapes.
8. Replace Cloudflare `HTMLRewriter` in the metadata endpoint with a Node-compatible parser. Preserve robots.txt behavior, entity decoding, JSON-LD keyword extraction, cover inlining, and timeout/error messages as closely as practical.
9. Update imports and aliases. Configure `@/*` to the chosen source root.
10. Add Vercel-compatible headers via `next.config.ts` `headers()` or `vercel.json`. Preserve:
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-Frame-Options: DENY`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
   - long immutable caching for generated static assets where Next/Vercel does not already handle it
   - one-week favicon caching if configured manually
11. Run formatting, lint, type check, and production build.
12. Run browser verification in desktop and mobile widths. Test view mode, unlock, create/edit/delete/favorite, search, filters, drawer management, appearance changes, dark mode, shortcuts, metadata autofill, and offline/error UI.
13. Prepare Vercel deployment notes and environment variable setup.

## LLM-Specific Guidance
Use Claude's strength with long-context analysis: keep source findings separated from implementation decisions. Use headings or XML-style delimiters if useful, but do not over-explain in the final response. When unsure, state an assumption and continue if it is low risk. Ask only for decisions that materially affect exact parity, such as visible renaming, storage provider, or deployment credentials.

## Quality Bar
The port is done only when:

- `npm run build` succeeds.
- TypeScript has no unchecked route-handler or client/server boundary errors.
- The app runs locally with Vercel-style environment variables.
- Public read mode works without auth.
- Edit mode works after passcode auth and rejects invalid/expired tokens.
- Bookmark, drawer, and appearance data survive reloads through cloud storage and local fallback.
- Metadata autofill works for representative URLs and fails gracefully.
- The visible UI matches the source at desktop, tablet, and mobile widths.
- Keyboard shortcuts work and do not hijack input fields.
- No secrets appear in client bundles or logs.
- Vercel deployment is configured for project name `dash`.

## Verification
Run these commands, adjusting only if the final scaffold uses a different package manager:

```bash
npm install
npm run lint
npm run build
npm run dev
```

Recommended browser checks:

- `http://localhost:3000` in light mode and dark mode.
- Mobile viewport around 390x844.
- Tablet viewport around 768x1024.
- Desktop viewport around 1440x900.
- Empty Redis state: presets appear and sync status handles null cloud bookmarks.
- Existing Redis state: bookmarks, drawers, and appearance load from cloud and write to localStorage.
- Bad passcode returns incorrect-passcode UI.
- Expired/invalid token clears edit mode on protected write.
- Create bookmark with only a URL and verify metadata autofill.
- Create bookmark with manual title/description and verify metadata fetch is skipped.
- Delete custom drawer with cards blocked; delete empty custom drawer allowed.
- Appearance change syncs and applies for a fresh visitor.
- Offline/API error displays `Offline` or `Sync error` without losing local data.

Suggested automated tests:

- Auth token sign/verify and expiry behavior.
- `safeEqual` behavior.
- `normalizeAppearance`.
- `normalizeDrawers`, `validateNewDrawer`, `slugify`, and `deriveCode`.
- `withPresets` merge behavior.
- `normalizeUrl`, `hostnameOf`, and `generateClassification`.
- Metadata parser fixture for Open Graph, Twitter image fallback, JSON-LD keywords, malformed JSON-LD, and robots.txt disallow.

## Questions To Resolve
- Should the visible masthead/title remain "Jay's Catalogue" for exact visual parity, or should visible copy be renamed to "dash"?
- Should production data be migrated from the existing Cloudflare KV namespace to Upstash Redis, or should `dash` start with presets and an empty cloud store?
