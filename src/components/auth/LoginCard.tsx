"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { LogoMark } from "@/components/LogoMark";

interface Providers {
  credentials: boolean;
  github: boolean;
  google: boolean;
}

export function LoginCard({
  providers,
  callbackUrl,
  initialError,
}: {
  providers: Providers;
  callbackUrl: string;
  initialError?: string;
}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [busy, setBusy] = React.useState<null | "credentials" | "github" | "google">(
    null,
  );

  async function onCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("credentials");
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Incorrect email or password.");
        setBusy(null);
        return;
      }
      // Hard navigation so the fresh session cookie is in play for middleware.
      window.location.assign(callbackUrl);
    } catch {
      setError("Sign-in failed — try again.");
      setBusy(null);
    }
  }

  function onOAuth(provider: "github" | "google") {
    setBusy(provider);
    void signIn(provider, { callbackUrl });
  }

  const hasOAuth = providers.github || providers.google;

  return (
    <div className="login-card w-full max-w-[400px]">
      {/* Masthead */}
      <div className="flex flex-col items-center text-center gap-1.5 mb-7">
        <LogoMark className="h-14 w-14 mb-1" />
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          Vol. I · Ed. 01
        </span>
        <span className="font-display italic text-4xl leading-none">Dash</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          An index of elsewhere
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 border border-destructive/60 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive"
        >
          {error}
        </div>
      )}

      {hasOAuth && (
        <div className="flex flex-col gap-2.5">
          {providers.github && (
            <button
              type="button"
              onClick={() => onOAuth("github")}
              disabled={busy !== null}
              className="h-11 inline-flex items-center justify-center gap-2.5 border border-ink/30 bg-card hover:border-accent hover:text-accent focus-ring transition-colors font-mono text-[11px] uppercase tracking-[0.18em] disabled:opacity-50"
            >
              <GitHubMark /> Continue with GitHub
            </button>
          )}
          {providers.google && (
            <button
              type="button"
              onClick={() => onOAuth("google")}
              disabled={busy !== null}
              className="h-11 inline-flex items-center justify-center gap-2.5 border border-ink/30 bg-card hover:border-accent hover:text-accent focus-ring transition-colors font-mono text-[11px] uppercase tracking-[0.18em] disabled:opacity-50"
            >
              <GoogleMark /> Continue with Google
            </button>
          )}
        </div>
      )}

      {hasOAuth && providers.credentials && (
        <div className="flex items-center gap-3 my-6">
          <span className="hairline flex-1" />
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
            or
          </span>
          <span className="hairline flex-1" />
        </div>
      )}

      {providers.credentials && (
        <form onSubmit={onCredentials} className="flex flex-col gap-3.5" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 border border-ink/30 bg-card px-3 font-mono text-sm focus-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 border border-ink/30 bg-card px-3 font-mono text-sm focus-ring"
            />
          </label>
          <button
            type="submit"
            disabled={busy !== null}
            className="h-11 mt-1 inline-flex items-center justify-center border border-accent bg-accent text-accent-foreground hover:bg-accent/90 focus-ring transition-colors font-mono text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {busy === "credentials" ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      {!providers.credentials && !hasOAuth && (
        <p className="font-mono text-[11px] text-muted-foreground text-center">
          No sign-in method is configured. Set the auth env vars to enable login.
        </p>
      )}
    </div>
  );
}

function GitHubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.31-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.87.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.6-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.38z" />
      <path fill="#34A853" d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 23.5z" />
      <path fill="#FBBC05" d="M5.55 14.17a6.9 6.9 0 0 1 0-4.34V6.85H1.7a11.5 11.5 0 0 0 0 10.3l3.85-2.98z" />
      <path fill="#EA4335" d="M12 4.74c1.69 0 3.21.58 4.4 1.72l3.3-3.3A11.5 11.5 0 0 0 12 .5 11.5 11.5 0 0 0 1.7 6.85l3.85 2.98C6.46 6.77 9 4.74 12 4.74z" />
    </svg>
  );
}
