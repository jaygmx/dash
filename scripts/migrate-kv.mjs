#!/usr/bin/env node
/**
 * One-shot migration: Cloudflare KV  ->  Upstash Redis.
 *
 * Copies the three Dash keys (bookmarks / drawers / appearance) verbatim, as
 * raw JSON strings, so the live site keeps its current cards, drawers, and
 * palette after the store swap. Idempotent — safe to re-run; it overwrites the
 * same keys.
 *
 * Reads env from the process and (as a convenience) from .env.local in the
 * project root. Needs:
 *   Cloudflare (source):  CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_KV_API_TOKEN
 *   Upstash   (target):   KV_REST_API_URL + KV_REST_API_TOKEN
 *                         (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *
 * Usage:  node scripts/migrate-kv.mjs
 */

import { readFileSync } from "node:fs";
import { Redis } from "@upstash/redis";

// --- tiny .env.local loader (no dependency) ------------------------------
try {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
} catch {
  /* no .env.local — rely on the ambient environment */
}

const KEYS = ["bookmarks:default", "drawers:default", "appearance:default"];
const CF_BASE = "https://api.cloudflare.com/client/v4";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

async function cfRead(key) {
  const accountId = requireEnv("CF_ACCOUNT_ID");
  const namespaceId = requireEnv("CF_KV_NAMESPACE_ID");
  const token = requireEnv("CF_KV_API_TOKEN");
  const url = `${CF_BASE}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(
    key,
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`CF read failed for ${key} (${res.status}): ${await res.text()}`);
  }
  return res.text();
}

function upstash() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error(
      "Missing Upstash env (KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/TOKEN).",
    );
    process.exit(1);
  }
  return new Redis({ url, token, automaticDeserialization: false });
}

async function main() {
  const redis = upstash();
  let copied = 0;
  for (const key of KEYS) {
    const value = await cfRead(key);
    if (value == null) {
      console.log(`  skip  ${key} (absent in Cloudflare KV)`);
      continue;
    }
    await redis.set(key, value);
    console.log(`  ok    ${key} (${value.length} bytes)`);
    copied++;
  }
  console.log(`\nMigration complete — ${copied}/${KEYS.length} key(s) copied to Upstash.`);
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});
