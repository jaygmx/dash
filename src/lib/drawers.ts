/**
 * Drawers — the named buckets a bookmark lives in (formerly "categories").
 * Cloud-synced via KV (`drawers:default`), owner-only writes.
 *
 * `Bookmark.category` stores the drawer `key`. The five `builtIn` drawers
 * below match the previously-hardcoded categories so existing bookmarks
 * keep displaying correctly even before any user customisation.
 */

export interface Drawer {
  /** Slug; written into Bookmark.category. */
  key: string;
  /** Display label. */
  label: string;
  /** 2-3 char classification prefix (e.g. "PS"). */
  code: string;
  /** True for the five shipped drawers — they can be reordered/relabelled
   *  later but, for now, can't be removed. */
  builtIn?: boolean;
}

export const DEFAULT_DRAWERS: Drawer[] = [
  { key: "personal", label: "Personal", code: "PS", builtIn: true },
  { key: "work",     label: "Work",     code: "WK", builtIn: true },
  { key: "tools",    label: "Tools",    code: "TL", builtIn: true },
  { key: "reading",  label: "Reading",  code: "RD", builtIn: true },
  { key: "play",     label: "Play",     code: "PL", builtIn: true },
];

/** Defensive cap to keep the chip row + select sane. */
export const MAX_DRAWERS = 32;

/** Turn a free-text label into a URL-safe slug used as the drawer key. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/** Derive a 2-3 char uppercase classification code from a label. */
export function deriveCode(label: string): string {
  const cleaned = label.trim();
  if (!cleaned) return "";
  const words = cleaned
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}

export function findDrawer(drawers: Drawer[], key: string): Drawer | undefined {
  return drawers.find((d) => d.key === key);
}

export function drawerLabel(drawers: Drawer[], key: string): string {
  return findDrawer(drawers, key)?.label ?? key;
}

export function drawerCode(drawers: Drawer[], key: string): string {
  return findDrawer(drawers, key)?.code ?? "—";
}

/** Validate a candidate Drawer against the current list; returns an error message or null. */
export function validateNewDrawer(
  candidate: { label: string; code: string },
  existing: Drawer[],
): string | null {
  const label = candidate.label.trim();
  if (!label) return "Label is required.";
  const key = slugify(label);
  if (!key) return "Label must contain letters or numbers.";
  const code = candidate.code.trim().toUpperCase();
  if (!code) return "Classification code is required.";
  if (!/^[A-Z0-9]{2,3}$/.test(code)) {
    return "Code must be 2-3 letters or digits.";
  }
  if (existing.some((d) => d.key === key)) {
    return `A drawer named "${label}" already exists.`;
  }
  if (existing.some((d) => d.code.toUpperCase() === code)) {
    return `Code "${code}" is already used by another drawer.`;
  }
  if (existing.length >= MAX_DRAWERS) {
    return `Drawer limit reached (${MAX_DRAWERS}).`;
  }
  return null;
}

const DRAWERS_LOCAL_KEY = "jay.portal.drawers.v1";

export function loadDrawersLocal(): Drawer[] {
  if (typeof window === "undefined") return DEFAULT_DRAWERS;
  try {
    const raw = window.localStorage.getItem(DRAWERS_LOCAL_KEY);
    if (!raw) return DEFAULT_DRAWERS;
    return normalizeDrawers(JSON.parse(raw));
  } catch {
    return DEFAULT_DRAWERS;
  }
}

export function saveDrawersLocal(drawers: Drawer[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAWERS_LOCAL_KEY, JSON.stringify(drawers));
}

export function normalizeDrawers(raw: unknown): Drawer[] {
  if (!Array.isArray(raw)) return DEFAULT_DRAWERS;
  const out: Drawer[] = [];
  const seenKeys = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<Drawer>;
    const key = typeof o.key === "string" ? slugify(o.key) : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const code = typeof o.code === "string" ? o.code.trim().toUpperCase() : "";
    if (!key || !label || !code) continue;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    out.push({
      key,
      label,
      code,
      builtIn: Boolean(o.builtIn),
    });
  }
  if (out.length === 0) return DEFAULT_DRAWERS;
  // Always merge any missing built-ins so existing presets remain valid.
  for (const d of DEFAULT_DRAWERS) {
    if (!seenKeys.has(d.key)) out.push(d);
  }
  return out.slice(0, MAX_DRAWERS);
}
