#!/usr/bin/env bash
#
# Wire dash's GitHub + Google OAuth using the SAME OAuth apps as ../pkm.
# Run from the project root:  bash scripts/oauth-from-pkm.sh
#
# pkm's secret values are redacted by Vercel on `env pull`, so paste them once
# here. Reveal them in the pkm Vercel dashboard (Project pkm → Settings →
# Environment Variables → click the value), or copy from the Google / GitHub
# developer consoles.
#
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

cat <<'NOTE'
────────────────────────────────────────────────────────────────────────────
FIRST register dash's callback URLs on the same OAuth apps pkm uses:

  Google  (console.cloud.google.com → APIs & Services → Credentials → OAuth
           client → Authorized redirect URIs → Add):
      https://dash.brevy.dev/api/auth/callback/google
      http://localhost:3000/api/auth/callback/google     (local dev)

  GitHub  (github.com → Settings → Developer settings → OAuth Apps → app →
           Callback URLs → Add; GitHub OAuth apps allow multiple):
      https://dash.brevy.dev/api/auth/callback/github
      http://localhost:3000/api/auth/callback/github      (local dev)

Also confirm AUTH_ALLOWED_EMAILS in dash includes the email each provider
returns (Google = your gmail; GitHub = your VERIFIED PRIMARY email — add it if
it differs from jayaharan@gmail.com).
────────────────────────────────────────────────────────────────────────────
NOTE
read -rp "Press Enter once the callback URLs are registered… " _

read -rp  "GitHub Client ID:     " GH_ID
read -rsp "GitHub Client Secret: " GH_SECRET; echo
read -rp  "Google Client ID:     " GG_ID
read -rsp "Google Client Secret: " GG_SECRET; echo

add_env() {
  vercel env rm "$1" production --yes >/dev/null 2>&1 || true
  printf '%s\n' "$2" | vercel env add "$1" production >/dev/null 2>&1
  echo "  set $1 (production)"
}
echo "==> setting Vercel production env"
add_env AUTH_GITHUB_ID     "$GH_ID"
add_env AUTH_GITHUB_SECRET "$GH_SECRET"
add_env AUTH_GOOGLE_ID     "$GG_ID"
add_env AUTH_GOOGLE_SECRET "$GG_SECRET"

# Local dev (.env.local) — OAuth IDs/secrets have no '$', no escaping needed.
if ! grep -q '^AUTH_GITHUB_ID=' .env.local 2>/dev/null; then
  {
    echo ""
    echo "# GitHub/Google OAuth (same apps as ../pkm)"
    echo "AUTH_GITHUB_ID=$GH_ID"
    echo "AUTH_GITHUB_SECRET=$GH_SECRET"
    echo "AUTH_GOOGLE_ID=$GG_ID"
    echo "AUTH_GOOGLE_SECRET=$GG_SECRET"
  } >> .env.local
  echo "  appended to .env.local"
fi

echo "==> redeploying production (empty commit so Vercel rebuilds with the new env)"
git commit --allow-empty -q -m "chore: enable GitHub/Google OAuth env"
git push origin main

echo
echo "Done. In ~1 min, https://dash.brevy.dev/login will show 'Continue with"
echo "GitHub' and 'Continue with Google'. Test each; an allowlist failure shows"
echo "as ?error=AccessDenied (fix AUTH_ALLOWED_EMAILS)."
