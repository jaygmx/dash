import { jsonResponse, verifyToken } from "@/lib/server/auth";
import { kvGet, kvPut } from "@/lib/server/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "drawers:default";
const MAX_DRAWERS = 32;

interface Drawer {
  key: string;
  label: string;
  code: string;
  builtIn?: boolean;
}

const DEFAULTS: Drawer[] = [
  { key: "personal", label: "Personal", code: "PS", builtIn: true },
  { key: "work",     label: "Work",     code: "WK", builtIn: true },
  { key: "tools",    label: "Tools",    code: "TL", builtIn: true },
  { key: "reading",  label: "Reading",  code: "RD", builtIn: true },
  { key: "play",     label: "Play",     code: "PL", builtIn: true },
];

function isValidDrawer(d: unknown): d is Drawer {
  if (!d || typeof d !== "object") return false;
  const o = d as Record<string, unknown>;
  return (
    typeof o.key === "string" && /^[a-z0-9-]{1,24}$/.test(o.key) &&
    typeof o.label === "string" && o.label.trim().length > 0 && o.label.length <= 40 &&
    typeof o.code === "string" && /^[A-Z0-9]{2,3}$/.test(o.code)
  );
}

function bearer(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
}

export async function GET(): Promise<Response> {
  const raw = await kvGet(KEY);
  if (!raw) return jsonResponse({ drawers: DEFAULTS });
  try {
    const parsed = JSON.parse(raw);
    const drawers = Array.isArray(parsed) ? parsed.filter(isValidDrawer) : [];
    return jsonResponse({ drawers: drawers.length ? drawers : DEFAULTS });
  } catch {
    return jsonResponse({ drawers: DEFAULTS });
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

  let payload: { drawers?: unknown } = {};
  try {
    payload = (await request.json()) as { drawers?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(payload.drawers)) {
    return jsonResponse(
      { error: "Body must be { drawers: Drawer[] }." },
      { status: 400 },
    );
  }
  if (payload.drawers.length > MAX_DRAWERS) {
    return jsonResponse(
      { error: `At most ${MAX_DRAWERS} drawers permitted.` },
      { status: 413 },
    );
  }
  const valid = payload.drawers.filter(isValidDrawer);
  if (valid.length !== payload.drawers.length) {
    return jsonResponse(
      { error: "One or more drawers failed validation." },
      { status: 400 },
    );
  }

  // Ensure key + code uniqueness.
  const keys = new Set<string>();
  const codes = new Set<string>();
  for (const d of valid) {
    if (keys.has(d.key)) {
      return jsonResponse({ error: `Duplicate key "${d.key}".` }, { status: 400 });
    }
    if (codes.has(d.code)) {
      return jsonResponse({ error: `Duplicate code "${d.code}".` }, { status: 400 });
    }
    keys.add(d.key);
    codes.add(d.code);
  }

  await kvPut(KEY, JSON.stringify(valid));
  return jsonResponse({ ok: true, drawers: valid });
}
