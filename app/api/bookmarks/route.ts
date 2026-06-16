import { jsonResponse, unauthorized } from "@/lib/server/http";
import { requireOwner } from "@/lib/server/nextauth";
import { kvGet, kvPut, kvDel } from "@/lib/server/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "bookmarks:default";
// 2 MB lets a few dozen bookmarks carry base64 og:image covers (~50–80 KB
// each after the meta endpoint's size gate).
const MAX_BYTES = 2 * 1024 * 1024;

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export async function GET(): Promise<Response> {
  if (!(await requireOwner())) return unauthorized();
  const raw = await kvGet(KEY);
  if (!raw) return jsonResponse({ bookmarks: null, version: null });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return jsonResponse(
      { error: "Stored payload is malformed JSON." },
      { status: 500 },
    );
  }
  return jsonResponse({ bookmarks: parsed, version: djb2(raw) });
}

export async function PUT(request: Request): Promise<Response> {
  if (!(await requireOwner())) return unauthorized();

  let payload: { bookmarks?: unknown } = {};
  try {
    payload = (await request.json()) as { bookmarks?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(payload.bookmarks)) {
    return jsonResponse(
      { error: "Expected body { bookmarks: Bookmark[] }." },
      { status: 400 },
    );
  }

  const serialized = JSON.stringify(payload.bookmarks);
  if (serialized.length > MAX_BYTES) {
    return jsonResponse(
      { error: `Payload exceeds ${MAX_BYTES} bytes.` },
      { status: 413 },
    );
  }

  await kvPut(KEY, serialized);
  return jsonResponse({ ok: true, version: djb2(serialized) });
}

export async function DELETE(): Promise<Response> {
  if (!(await requireOwner())) return unauthorized();
  await kvDel(KEY);
  return jsonResponse({ ok: true });
}
