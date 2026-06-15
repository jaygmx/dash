import {
  SESSION_TTL_MS,
  jsonResponse,
  safeEqual,
  signToken,
} from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const EDIT_PASSCODE = process.env.EDIT_PASSCODE;
  const AUTH_SECRET = process.env.AUTH_SECRET;
  if (!EDIT_PASSCODE || !AUTH_SECRET) {
    return jsonResponse(
      { error: "Cloud auth not configured (missing EDIT_PASSCODE or AUTH_SECRET)." },
      { status: 500 },
    );
  }

  let payload: { passcode?: unknown } = {};
  try {
    payload = (await request.json()) as { passcode?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  const passcode = typeof payload.passcode === "string" ? payload.passcode : "";
  if (!passcode) {
    return jsonResponse({ error: "Passcode required." }, { status: 400 });
  }

  const ok = await safeEqual(passcode, EDIT_PASSCODE);
  if (!ok) {
    return jsonResponse({ error: "Incorrect passcode." }, { status: 401 });
  }

  const expiry = Date.now() + SESSION_TTL_MS;
  const token = await signToken(expiry, AUTH_SECRET);
  return jsonResponse({ token, expiry });
}

// Reject all other methods to keep the surface small.
function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const PATCH = methodNotAllowed;
