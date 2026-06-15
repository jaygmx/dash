import { jsonResponse, verifyToken } from "@/lib/server/auth";
import { kvGet, kvPut } from "@/lib/server/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "appearance:default";

const THEME_KEYS = ["vermillion", "ocean", "forest", "noir", "terracotta"] as const;
const FONT_KEYS  = ["editorial", "periodical", "bauhaus", "literary", "industrial"] as const;
type ThemeKey = (typeof THEME_KEYS)[number];
type FontKey  = (typeof FONT_KEYS)[number];

interface Appearance {
  theme: ThemeKey;
  font: FontKey;
}

const DEFAULT_APPEARANCE: Appearance = { theme: "vermillion", font: "editorial" };

function isTheme(v: unknown): v is ThemeKey {
  return typeof v === "string" && (THEME_KEYS as readonly string[]).includes(v);
}
function isFont(v: unknown): v is FontKey {
  return typeof v === "string" && (FONT_KEYS as readonly string[]).includes(v);
}

function bearer(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
}

export async function GET(): Promise<Response> {
  const raw = await kvGet(KEY);
  if (!raw) return jsonResponse({ appearance: DEFAULT_APPEARANCE });
  try {
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    const appearance: Appearance = {
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_APPEARANCE.theme,
      font:  isFont(parsed.font)   ? parsed.font  : DEFAULT_APPEARANCE.font,
    };
    return jsonResponse({ appearance });
  } catch {
    return jsonResponse({ appearance: DEFAULT_APPEARANCE });
  }
}

export async function PUT(request: Request): Promise<Response> {
  const AUTH_SECRET = process.env.AUTH_SECRET;
  if (!AUTH_SECRET) {
    return jsonResponse(
      { error: "Cloud auth not configured (missing AUTH_SECRET)." },
      { status: 500 },
    );
  }
  const token = bearer(request);
  if (!token || !(await verifyToken(token, AUTH_SECRET))) {
    return jsonResponse({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: Partial<Appearance> = {};
  try {
    payload = (await request.json()) as Partial<Appearance>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!isTheme(payload.theme) || !isFont(payload.font)) {
    return jsonResponse(
      {
        error: "Body must be { theme, font } with valid keys.",
        validThemes: THEME_KEYS,
        validFonts: FONT_KEYS,
      },
      { status: 400 },
    );
  }

  const next: Appearance = { theme: payload.theme, font: payload.font };
  await kvPut(KEY, JSON.stringify(next));
  return jsonResponse({ ok: true, appearance: next });
}
