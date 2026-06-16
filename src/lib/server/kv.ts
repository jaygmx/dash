/**
 * Server-only KV adapter backed by **Upstash Redis** (via the Vercel
 * Marketplace integration).
 *
 * The original app (jug) used Cloudflare KV; the first Vercel port talked to
 * the same namespace over Cloudflare's REST API. This version moves the store
 * onto Vercel-native Upstash Redis. The exported `kvGet` / `kvPut` / `kvDel`
 * surface is unchanged, so the route handlers read exactly as before and this
 * remains the single place to swap stores.
 *
 * Values are raw JSON strings (parity with the KV source + the djb2 version
 * hash in the bookmarks route). `automaticDeserialization: false` keeps the
 * Upstash client from JSON-parsing on read / re-stringifying on write — the
 * handlers own (de)serialization, so we want bytes in, bytes out.
 *
 * Required env (server-only — never exposed to the client bundle). The Vercel
 * Upstash integration injects the `KV_REST_API_*` pair; the `UPSTASH_REDIS_*`
 * pair is the native name. Either works:
 *   KV_REST_API_URL / KV_REST_API_TOKEN
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from "@upstash/redis";

export class KvNotConfiguredError extends Error {}

let client: Redis | null = null;

function redis(): Redis {
  if (client) return client;
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new KvNotConfiguredError(
      "KV not configured (missing KV_REST_API_URL / KV_REST_API_TOKEN, or the UPSTASH_REDIS_REST_* equivalents).",
    );
  }
  client = new Redis({ url, token, automaticDeserialization: false });
  return client;
}

/** Read a raw string value, or null when the key is absent. */
export async function kvGet(key: string): Promise<string | null> {
  const value = await redis().get<string | null>(key);
  if (value == null) return null;
  return typeof value === "string" ? value : String(value);
}

/** Write a raw string value. */
export async function kvPut(key: string, value: string): Promise<void> {
  await redis().set(key, value);
}

/** Delete a key. */
export async function kvDel(key: string): Promise<void> {
  await redis().del(key);
}
