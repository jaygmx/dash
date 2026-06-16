import type { Bookmark } from "./types";
import type { Appearance } from "./appearance";
import { normalizeAppearance } from "./appearance";
import type { Drawer } from "./drawers";
import { DEFAULT_DRAWERS, normalizeDrawers } from "./drawers";

/**
 * Client fetch layer. Auth is the NextAuth **session cookie** — every request
 * is same-origin, so the cookie rides along automatically; there are no bearer
 * tokens to manage. A 401 means the session expired (→ bounce to /login).
 */

export type SyncStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "saving" }
  | { state: "ok"; at: number }
  | { state: "offline" }
  | { state: "error"; message: string };

export class CloudUnavailableError extends Error {}
export class CloudUnauthorizedError extends Error {}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export interface CloudBookmarksResponse {
  bookmarks: Bookmark[] | null;
  version: string | null;
}

/** Fetch the canonical bookmark list from the store. */
export async function fetchCloudBookmarks(): Promise<CloudBookmarksResponse> {
  let res: Response;
  try {
    res = await fetch("/api/bookmarks", { method: "GET" });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired.");
  }
  if (res.status === 404) {
    throw new CloudUnavailableError("API endpoint not found.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Read failed (${res.status}).`);
  }
  return (await res.json()) as CloudBookmarksResponse;
}

/** Replace the canonical bookmark list in the store. */
export async function pushCloudBookmarks(
  bookmarks: Bookmark[],
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/bookmarks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarks }),
    });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired — please sign in again.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Save failed (${res.status}).`);
  }
  const body = (await res.json()) as { version?: string };
  return body?.version ?? null;
}

/* ---------- Appearance (cloud-synced palette + font pair) ---------- */

export async function fetchCloudAppearance(): Promise<Appearance> {
  let res: Response;
  try {
    res = await fetch("/api/appearance", { method: "GET" });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) throw new CloudUnauthorizedError("Session expired.");
  if (res.status === 404) {
    throw new CloudUnavailableError("API endpoint not found.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Read failed (${res.status}).`);
  }
  const body = (await res.json()) as { appearance: unknown };
  return normalizeAppearance(body?.appearance);
}

export async function pushCloudAppearance(appearance: Appearance): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/appearance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appearance),
    });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired — please sign in again.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Save failed (${res.status}).`);
  }
}

/* ---------- Drawers (cloud-synced category list) ---------- */

export async function fetchCloudDrawers(): Promise<Drawer[]> {
  let res: Response;
  try {
    res = await fetch("/api/drawers", { method: "GET" });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) throw new CloudUnauthorizedError("Session expired.");
  if (res.status === 404) {
    throw new CloudUnavailableError("API endpoint not found.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Read failed (${res.status}).`);
  }
  const body = (await res.json()) as { drawers?: unknown };
  const drawers = normalizeDrawers(body?.drawers);
  return drawers.length ? drawers : DEFAULT_DRAWERS;
}

export async function pushCloudDrawers(drawers: Drawer[]): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/drawers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawers }),
    });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired — please sign in again.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Save failed (${res.status}).`);
  }
}

/* ---------- URL meta fetch ---------- */

export interface UrlMeta {
  title: string;
  description: string;
  tags: string[];
  cover: string;
}

export async function fetchUrlMeta(url: string): Promise<UrlMeta> {
  let res: Response;
  try {
    res = await fetch("/api/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired — please sign in again.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Meta fetch failed (${res.status}).`);
  }
  const body = (await res.json()) as Partial<UrlMeta>;
  return {
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    tags: Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === "string")
      : [],
    cover: typeof body.cover === "string" ? body.cover : "",
  };
}
