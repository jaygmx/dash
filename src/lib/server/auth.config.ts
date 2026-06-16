/**
 * Edge-safe NextAuth base config (no providers, no node-only deps).
 *
 * This half is imported by `middleware.ts`, which runs on the edge and only
 * needs to *verify* the JWT session (using AUTH_SECRET) — it must never pull in
 * the Credentials provider / bcrypt. The provider list + node bits live in
 * `nextauth.ts`, which spreads this config and adds `providers`.
 */
import type { NextAuthConfig } from "next-auth";
import { isAllowedEmail } from "./allowlist";

export const authConfig = {
  // Vercel sets the host; trust it so callback URLs resolve in production.
  trustHost: true,
  // Stateless JWT sessions — no database adapter (Dash is single-owner).
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Real providers are added in nextauth.ts; the edge/middleware instance only
  // verifies the session, so an empty list here is correct.
  providers: [],
  callbacks: {
    /** Used by the `authorized` middleware gate. */
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
    /**
     * Gate OAuth sign-ins: only a VERIFIED, allowlisted email may proceed.
     * Both providers surface `email_verified` (Google natively; GitHub via the
     * userinfo override in nextauth.ts), so the check is provider-agnostic.
     * Credentials sign-ins already validated the password, so they pass through.
     */
    async signIn({ account, profile, user }) {
      if (!account || account.provider === "credentials") return true;
      if (profile?.email_verified !== true) return false;
      const email = (profile?.email ?? user?.email ?? "").toString();
      return isAllowedEmail(email);
    },
  },
} satisfies NextAuthConfig;
