/**
 * OAuth allowlist. Dash is a single-owner site: only addresses listed in
 * AUTH_ALLOWED_EMAILS (comma-separated, case-insensitive) may complete a
 * GitHub / Google sign-in. Fails CLOSED — an empty or missing list admits
 * nobody, so a misconfigured deploy can't accidentally open to the public.
 */
export function allowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.trim().toLowerCase());
}
