/**
 * Core bookmark types. The drawer (formerly "category") system lives in
 * `./drawers.ts` and is now runtime-dynamic, so `Bookmark.category` is a
 * free-form string keyed to a Drawer.
 *
 * Title is optional: when filing by URL alone, the server's /api/meta
 * endpoint fills it in. Empty strings are normalised away on save.
 */
export interface Bookmark {
  id: string;
  /** Optional — when blank at save time, derived from URL meta or hostname. */
  title?: string;
  url: string;
  description?: string;
  /** Drawer key (see src/lib/drawers.ts). */
  category: string;
  tags: string[];
  /** Cover image — either a `data:image/…;base64,…` URI (offline-safe) or
   *  an absolute https URL. Falsy = no cover, render the text-only card. */
  cover?: string;
  favorite: boolean;
  createdAt: number;
  /** Optional override; otherwise derived from drawer code + id hash. */
  classification?: string;
  /** True for predefined entries — UI may mark them differently. */
  preset?: boolean;
}
