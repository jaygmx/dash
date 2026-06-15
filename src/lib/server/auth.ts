/**
 * HMAC token helpers, shared by the auth + bookmarks Pages Functions.
 *
 * Tokens have the shape `<expiryMillis>.<hexHmac>` where the HMAC is computed
 * over the string form of `expiryMillis` using AUTH_SECRET as the key. The
 * server never persists tokens — verification is purely cryptographic.
 */

const enc = new TextEncoder();

export async function safeEqual(a: string, b: string): Promise<boolean> {
  const ha = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a)));
  const hb = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(b)));
  if (ha.length !== hb.length) return false;
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signToken(expiry: number, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(String(expiry)));
  return `${expiry}.${toHex(sig)}`;
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiry = Number(token.slice(0, dot));
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  const expected = await signToken(expiry, secret);
  return safeEqual(expected, token);
}

export const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}
