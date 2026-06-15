import type { Bookmark } from "./types";
import type { Appearance } from "./appearance";
import { normalizeAppearance } from "./appearance";
import type { Drawer } from "./drawers";
import { DEFAULT_DRAWERS, normalizeDrawers } from "./drawers";

const TOKEN_KEY = "jay.portal.cloud-token.v1";

export interface CloudToken {
  token: string;
  expiry: number;
}

export type SyncStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "saving" }
  | { state: "ok"; at: number }
  | { state: "offline" }
  | { state: "error"; message: string };

export class CloudUnavailableError extends Error {}
export class CloudUnauthorizedError extends Error {}

/* ---------- Token (bearer) management ---------- */

export function loadToken(): CloudToken | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as CloudToken;
    if (!t.token || !t.expiry || Date.now() > t.expiry) {
      window.localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

export function saveToken(t: CloudToken): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

/* ---------- API calls ---------- */

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Exchange a passcode for a signed bearer token. */
export async function requestToken(passcode: string): Promise<CloudToken> {
  let res: Response;
  try {
    res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
  } catch (e) {
    throw new CloudUnavailableError(
      "Cloud unreachable — start `wrangler pages dev` or deploy to use edit mode.",
    );
  }
  if (res.status === 404) {
    throw new CloudUnavailableError(
      "Auth endpoint not found. Run `npm run preview:cf` or deploy to enable edit mode.",
    );
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Incorrect passcode.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Sign-in failed (${res.status}).`);
  }
  const body = (await res.json()) as CloudToken;
  if (!body?.token || !body?.expiry) {
    throw new Error("Malformed auth response.");
  }
  return body;
}

export interface CloudBookmarksResponse {
  bookmarks: Bookmark[] | null;
  version: string | null;
}

/** Fetch the canonical bookmark list from KV. Returns null if no cloud data. */
export async function fetchCloudBookmarks(): Promise<CloudBookmarksResponse> {
  let res: Response;
  try {
    res = await fetch("/api/bookmarks", { method: "GET" });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 404) {
    throw new CloudUnavailableError("API endpoint not found.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Read failed (${res.status}).`);
  }
  const body = (await res.json()) as CloudBookmarksResponse;
  return body;
}

/** Replace the canonical bookmark list in KV. */
export async function pushCloudBookmarks(
  bookmarks: Bookmark[],
  token: string,
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/bookmarks", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookmarks }),
    });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired — please unlock again.");
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

export async function pushCloudAppearance(
  appearance: Appearance,
  token: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/appearance", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(appearance),
    });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired — please unlock again.");
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

export async function pushCloudDrawers(
  drawers: Drawer[],
  token: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/drawers", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ drawers }),
    });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired — please unlock again.");
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

export async function fetchUrlMeta(url: string, token: string): Promise<UrlMeta> {
  let res: Response;
  try {
    res = await fetch("/api/meta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new CloudUnavailableError("Cloud unreachable.");
  }
  if (res.status === 401) {
    throw new CloudUnauthorizedError("Session expired — please unlock again.");
  }
  if (!res.ok) {
    const body = await readJson(res);
    throw new Error(body?.error ?? `Meta fetch failed (${res.status}).`);
  }
  const body = (await res.json()) as Partial<UrlMeta>;
  return {
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [],
    cover: typeof body.cover === "string" ? body.cover : "",
  };
}
