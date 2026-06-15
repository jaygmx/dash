/**
 * Server-only KV adapter backed by the **Cloudflare KV REST API**.
 *
 * The source app (jug) ran on Cloudflare Pages and called `env.BOOKMARKS_KV.get
 * /put/delete` directly. On Vercel there is no KV binding, so the route handlers
 * talk to the *same* namespace over Cloudflare's REST API instead. This adapter
 * exposes the identical `get` / `put` / `del` surface so the handlers read like
 * the originals, and it is the single place to swap stores later (e.g. Upstash).
 *
 * Values are stored as raw JSON strings (parity with the KV source + the djb2
 * version hash in the bookmarks route).
 *
 * Required env (server-only — never exposed to the client bundle):
 *   CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_KV_API_TOKEN
 */

const API_BASE = "https://api.cloudflare.com/client/v4";

interface KvConfig {
  accountId: string;
  namespaceId: string;
  token: string;
}

function config(): KvConfig {
  const accountId = process.env.CF_ACCOUNT_ID;
  const namespaceId = process.env.CF_KV_NAMESPACE_ID;
  const token = process.env.CF_KV_API_TOKEN;
  if (!accountId || !namespaceId || !token) {
    throw new KvNotConfiguredError(
      "KV not configured (missing CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, or CF_KV_API_TOKEN).",
    );
  }
  return { accountId, namespaceId, token };
}

export class KvNotConfiguredError extends Error {}

function valueUrl({ accountId, namespaceId }: KvConfig, key: string): string {
  return `${API_BASE}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(
    key,
  )}`;
}

/** Read a raw string value, or null when the key is absent. */
export async function kvGet(key: string): Promise<string | null> {
  const cfg = config();
  const res = await fetch(valueUrl(cfg, key), {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`KV read failed (${res.status}): ${await res.text()}`);
  }
  return res.text();
}

/** Write a raw string value. */
export async function kvPut(key: string, value: string): Promise<void> {
  const cfg = config();
  // The REST API expects multipart/form-data with a `value` field, or a raw
  // body. A raw text body is the simplest and is what the source KV `put`
  // semantics map to.
  const res = await fetch(valueUrl(cfg, key), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "text/plain",
    },
    body: value,
  });
  if (!res.ok) {
    throw new Error(`KV write failed (${res.status}): ${await res.text()}`);
  }
}

/** Delete a key. */
export async function kvDel(key: string): Promise<void> {
  const cfg = config();
  const res = await fetch(valueUrl(cfg, key), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`KV delete failed (${res.status}): ${await res.text()}`);
  }
}
