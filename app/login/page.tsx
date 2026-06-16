import { redirect } from "next/navigation";
import { auth, configuredProviders } from "@/lib/server/nextauth";
import ParticleField from "@/components/auth/ParticleField";
import { LoginCard } from "@/components/auth/LoginCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reject open-redirects — only allow internal absolute paths. */
function safeCallback(raw?: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

/** Map NextAuth's `?error=` codes to a human message. */
function errorMessage(code?: string): string | undefined {
  if (!code) return undefined;
  if (code === "AccessDenied") return "That account isn't on the allowlist.";
  if (code === "CredentialsSignin") return "Incorrect email or password.";
  return "Sign-in failed — try again.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = safeCallback(params.callbackUrl);

  // Already signed in → bounce to where they were headed.
  if (session?.user) redirect(callbackUrl);

  return (
    <>
      <ParticleField />
      <main className="login-stage">
        <LoginCard
          providers={configuredProviders()}
          callbackUrl={callbackUrl}
          initialError={errorMessage(params.error)}
        />
      </main>
    </>
  );
}
