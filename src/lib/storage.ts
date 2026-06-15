import type { Bookmark } from "./types";
import { PRESET_BOOKMARKS } from "./presets";

const STORAGE_KEY = "jay.portal.bookmarks.v1";
const THEME_KEY = "jay.portal.theme.v1";

/** Load the local bookmark cache, with any newly-shipped presets merged in. */
export function loadBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return PRESET_BOOKMARKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return PRESET_BOOKMARKS;
    const parsed = JSON.parse(raw) as Bookmark[];
    return withPresets(parsed);
  } catch {
    return PRESET_BOOKMARKS;
  }
}

export function saveBookmarks(bookmarks: Bookmark[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

/**
 * Merge any presets not present in `arr` (matched by id) onto the end. Lets
 * us ship new preset bookmarks in code without overwriting cloud state.
 */
export function withPresets(arr: Bookmark[] | null | undefined): Bookmark[] {
  const list = arr ?? [];
  const ids = new Set(list.map((b) => b.id));
  return [...list, ...PRESET_BOOKMARKS.filter((p) => !ids.has(p.id))];
}

export function loadTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function saveTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, theme);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/**
 * Generate a Dewey-flavored classification, e.g. "TL · 412.06".
 * `code` is the drawer's classification prefix (see src/lib/drawers.ts).
 */
export function generateClassification(code: string, id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const major = (hash % 900) + 10;
  const minor = (Math.floor(hash / 900) % 90) + 10;
  return `${code} · ${major}.${minor}`;
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
