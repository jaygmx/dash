/**
 * Catalogue appearance: cloud-synced palette + font pair. Owner-only switcher
 * lives in the masthead (edit mode). Light/dark stays a per-visitor choice.
 */

export const THEME_KEYS = [
  "vermillion",
  "ocean",
  "forest",
  "noir",
  "terracotta",
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

export const FONT_KEYS = [
  "editorial",
  "periodical",
  "bauhaus",
  "literary",
  "industrial",
] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export interface Appearance {
  theme: ThemeKey;
  font: FontKey;
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "vermillion",
  font: "editorial",
};

/* ---------- Display metadata (used by the picker UI) ---------- */

interface ThemeMeta {
  key: ThemeKey;
  label: string;
  hint: string;
  /** Swatch colors for the picker — paper / ink / accent. */
  swatch: { paper: string; ink: string; accent: string };
}

export const THEMES: ThemeMeta[] = [
  {
    key: "vermillion",
    label: "Vermillion",
    hint: "Cream paper · carbon ink · vermillion accent",
    swatch: { paper: "hsl(36 28% 92%)", ink: "hsl(24 12% 11%)", accent: "hsl(11 80% 50%)" },
  },
  {
    key: "ocean",
    label: "Ocean",
    hint: "Tide blue · deep navy · coral accent",
    swatch: { paper: "hsl(210 32% 94%)", ink: "hsl(215 45% 13%)", accent: "hsl(14 78% 58%)" },
  },
  {
    key: "forest",
    label: "Forest",
    hint: "Sage paper · pine ink · amber accent",
    swatch: { paper: "hsl(60 18% 92%)", ink: "hsl(145 35% 13%)", accent: "hsl(38 92% 50%)" },
  },
  {
    key: "noir",
    label: "Noir",
    hint: "Bone paper · jet ink · electric magenta",
    swatch: { paper: "hsl(30 12% 96%)", ink: "hsl(0 0% 8%)", accent: "hsl(322 84% 56%)" },
  },
  {
    key: "terracotta",
    label: "Terracotta",
    hint: "Desert sand · rust ink · teal accent",
    swatch: { paper: "hsl(32 42% 91%)", ink: "hsl(18 35% 18%)", accent: "hsl(180 55% 32%)" },
  },
];

interface FontMeta {
  key: FontKey;
  label: string;
  hint: string;
  /** Inline CSS family stacks used by the picker preview. */
  preview: { display: string; mono: string };
}

export const FONT_PAIRS: FontMeta[] = [
  {
    key: "editorial",
    label: "Editorial Italic",
    hint: "Instrument Serif · JetBrains Mono",
    preview: {
      display: '"Instrument Serif", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
  },
  {
    key: "periodical",
    label: "Periodical",
    hint: "Fraunces · IBM Plex Mono",
    preview: {
      display: '"Fraunces", Georgia, serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
    },
  },
  {
    key: "bauhaus",
    label: "Bauhaus",
    hint: "Big Shoulders Display · Space Mono",
    preview: {
      display: '"Big Shoulders Display", "Arial Narrow", sans-serif',
      mono: '"Space Mono", ui-monospace, monospace',
    },
  },
  {
    key: "literary",
    label: "Literary",
    hint: "Playfair Display · Cormorant Garamond",
    preview: {
      display: '"Playfair Display", Georgia, serif',
      mono: '"Cormorant Garamond", Georgia, serif',
    },
  },
  {
    key: "industrial",
    label: "Industrial",
    hint: "Archivo Black · Spline Sans Mono",
    preview: {
      display: '"Archivo Black", "Helvetica Neue", sans-serif',
      mono: '"Spline Sans Mono", ui-monospace, monospace',
    },
  },
];

/* ---------- Apply / load / save ---------- */

const APPEARANCE_KEY = "jay.portal.appearance.v1";

export function isThemeKey(v: unknown): v is ThemeKey {
  return typeof v === "string" && (THEME_KEYS as readonly string[]).includes(v);
}
export function isFontKey(v: unknown): v is FontKey {
  return typeof v === "string" && (FONT_KEYS as readonly string[]).includes(v);
}

export function normalizeAppearance(v: unknown): Appearance {
  const a = v as Partial<Appearance> | null | undefined;
  return {
    theme: isThemeKey(a?.theme) ? a!.theme : DEFAULT_APPEARANCE.theme,
    font: isFontKey(a?.font) ? a!.font : DEFAULT_APPEARANCE.font,
  };
}

/** Apply appearance to the document root (sets `data-theme` + `data-font`). */
export function applyAppearance(a: Appearance): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", a.theme);
  document.documentElement.setAttribute("data-font", a.font);
}

export function loadAppearanceLocal(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    return normalizeAppearance(JSON.parse(raw));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearanceLocal(a: Appearance): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(a));
}
