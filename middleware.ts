import NextAuth from "next-auth";
import { authConfig } from "@/lib/server/auth.config";

// Build an edge-safe NextAuth instance from the providerless config — it only
// needs to verify the JWT session cookie. Bcrypt / the Credentials provider
// never reach the edge bundle.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Authenticated → let it through.
  if (req.auth) return;

  const { pathname } = req.nextUrl;
  // The login page itself is public.
  if (pathname.startsWith("/login")) return;

  // Everything else redirects to /login, preserving where they were headed.
  const url = new URL("/login", req.nextUrl.origin);
  if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
  return Response.redirect(url);
});

export const config = {
  // Gate all pages. Exclude the NextAuth + data APIs (those self-gate and must
  // return JSON 401s, not HTML redirects), Next internals, and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.svg|favicon.ico|manifest.webmanifest|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
