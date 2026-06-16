/**
 * Full NextAuth setup (node runtime). Spreads the edge-safe `authConfig` and
 * adds the providers — each one CONDITIONAL on its env, so the login page only
 * shows the methods that are actually configured:
 *
 *   - Credentials  : owner email + bcrypt(password)   (AUTH_OWNER_EMAIL, AUTH_PASSWORD_HASH)
 *   - GitHub OAuth :                                   (AUTH_GITHUB_ID, AUTH_GITHUB_SECRET)
 *   - Google OAuth :                                   (AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET)
 *
 * Exposes `handlers` (the /api/auth/[...nextauth] route), plus the server-side
 * `auth` / `signIn` / `signOut`. Imported only by server code.
 */
import { timingSafeEqual } from "node:crypto";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

/** Length-safe constant-time string compare. */
function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Returns true once any provider is configured (used by the login page). */
export function configuredProviders(): {
  credentials: boolean;
  github: boolean;
  google: boolean;
} {
  return {
    credentials: Boolean(
      process.env.AUTH_OWNER_EMAIL &&
        (process.env.AUTH_PASSWORD_HASH || process.env.EDIT_PASSCODE),
    ),
    github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  };
}

// A fixed hash to compare against when the email doesn't match the owner, so
// response timing doesn't leak whether the email exists.
const DECOY_HASH =
  "$2b$12$xjAkQm/PF9zRuOKSv4Q4vOH6o/px2iLZruVR214nlfUrwPRnENkZW";

const providers: NextAuthConfig["providers"] = [];

if (
  process.env.AUTH_OWNER_EMAIL &&
  (process.env.AUTH_PASSWORD_HASH || process.env.EDIT_PASSCODE)
) {
  providers.push(
    Credentials({
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const email =
          typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        const ownerEmail = (process.env.AUTH_OWNER_EMAIL ?? "")
          .trim()
          .toLowerCase();
        const hash = process.env.AUTH_PASSWORD_HASH ?? "";
        const passcode = process.env.EDIT_PASSCODE ?? "";
        if (!ownerEmail || (!hash && !passcode)) return null;

        // Always run one bcrypt compare for a timing baseline (decoy when no
        // hash is set). Accept if EITHER the bcrypt hash OR the plain
        // EDIT_PASSCODE (constant-time) matches — the passcode path keeps login
        // working even if AUTH_PASSWORD_HASH is unset/mangled.
        const bcryptOk = await bcrypt.compare(password, hash || DECOY_HASH);
        const passcodeOk = passcode
          ? constantTimeEqual(password, passcode)
          : false;
        const ok = (hash ? bcryptOk : false) || passcodeOk;
        if (!ok || email !== ownerEmail) return null;

        return { id: "owner", email: ownerEmail, name: "Owner" };
      },
    }),
  );
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      // GitHub's default profile email can be unverified / non-primary and
      // carries no verified flag the signIn gate can see. Resolve the VERIFIED
      // PRIMARY email from /user/emails and stamp email_verified, so the gate
      // enforces it in code (matches ../pkm). Without this the allowlist could
      // be satisfied by an address the GitHub account never proved it owns.
      userinfo: {
        url: "https://api.github.com/user",
        async request({ tokens }: { tokens: { access_token?: string } }) {
          const headers = {
            Authorization: `Bearer ${tokens.access_token ?? ""}`,
            "User-Agent": "dash-auth",
            Accept: "application/vnd.github+json",
          };
          const profile = (await fetch("https://api.github.com/user", {
            headers,
          }).then((r) => r.json())) as Record<string, unknown>;
          const emails = (await fetch("https://api.github.com/user/emails", {
            headers,
          }).then((r) => (r.ok ? r.json() : []))) as Array<{
            email: string;
            primary: boolean;
            verified: boolean;
          }>;
          const verifiedPrimary = emails.find((e) => e.primary && e.verified);
          profile.email = verifiedPrimary?.email ?? null;
          profile.email_verified = Boolean(verifiedPrimary);
          return profile;
        },
      },
    }),
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
});

/**
 * Route-handler guard. Returns the session when a valid owner is signed in,
 * else null — callers return a 401. (Pages are gated by middleware; the data
 * APIs self-gate here so they answer with JSON, not an HTML redirect.)
 */
export async function requireOwner() {
  const session = await auth();
  return session?.user ? session : null;
}
