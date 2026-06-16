/** Shared JSON response helper for the API route handlers. */
export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

/** 401 with a JSON body — used when a route has no valid owner session. */
export function unauthorized(message = "Unauthorized — sign in required."): Response {
  return jsonResponse({ error: message }, { status: 401 });
}
