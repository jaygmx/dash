import { Parser } from "htmlparser2";
import { jsonResponse, unauthorized } from "@/lib/server/http";
import { requireOwner } from "@/lib/server/nextauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8000;
const ROBOTS_TIMEOUT_MS = 3000;
const COVER_TIMEOUT_MS = 6000;
const COVER_MAX_BYTES = 100 * 1024; // inline only when small enough to be cheap to store
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;
const MAX_TAGS = 5;
const MAX_TAG_LEN = 32;
const BOT_NAME = "DashBot";
// NOTE: header values must be Latin-1 (ByteString). Keep this ASCII — an
// em-dash here throws "Cannot convert argument to a ByteString" under Node's
// undici fetch (Cloudflare Workers tolerated it; Vercel/Node does not).
const USER_AGENT =
  `${BOT_NAME}/1.0 (+https://dash.brevy.dev - personal-use meta fetcher)`;

interface MetaResponse {
  title: string;
  description: string;
  tags: string[];
  /** Either an `https://…` URL (when the source image was too big to inline)
   *  or a `data:image/…;base64,…` URI (when inlined). Empty string = no cover. */
  cover: string;
}

/**
 * The parser hands us raw attribute / text content with HTML entities intact
 * (we run htmlparser2 with `decodeEntities: false` to match the original
 * HTMLRewriter behaviour). Decode the common named entities plus any numeric
 * escape so stored values are human-readable.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: " ",
  ndash: "–", mdash: "—", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»",
  copy: "©", reg: "®", trade: "™",
};

function decodeEntities(raw: string): string {
  return raw.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]+));/g,
    (match, dec: string | undefined, hex: string | undefined, name: string | undefined) => {
      if (dec) {
        const cp = parseInt(dec, 10);
        return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
      }
      if (hex) {
        const cp = parseInt(hex, 16);
        return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
      }
      if (name && NAMED_ENTITIES[name]) return NAMED_ENTITIES[name];
      return match;
    },
  );
}

function cleanInline(raw: string, max: number): string {
  return decodeEntities(raw).replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeTag(raw: string): string {
  return decodeEntities(raw)
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-+#. ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TAG_LEN);
}

function dedupe(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = normalizeTag(t);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/* ---------- robots.txt awareness ---------- */

/**
 * Minimal robots.txt parser. Honours the longest-match rule between
 * `Allow` and `Disallow` per the original spec. Matches by exact bot name
 * first; falls back to `*` group. Wildcards (`*`) and end-anchors (`$`) in
 * paths are supported.
 *
 * Returns true (allowed) on any parse / fetch failure — the polite bot
 * still serves the user.
 */
async function isAllowedByRobots(target: URL): Promise<boolean> {
  const robotsUrl = `${target.protocol}//${target.host}/robots.txt`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROBOTS_TIMEOUT_MS);
  let text = "";
  try {
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.status === 404 || res.status === 410) return true;
    if (!res.ok) return true;
    text = await res.text();
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }

  // Parse into groups.
  interface Group { agents: string[]; rules: Array<{ allow: boolean; pattern: string }>; }
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastDirectiveWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastDirectiveWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastDirectiveWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      if (!current) continue;
      current.rules.push({ allow: field === "allow", pattern: value });
      lastDirectiveWasAgent = false;
    } else {
      lastDirectiveWasAgent = false;
    }
  }

  const botLower = BOT_NAME.toLowerCase();
  const matchedGroups = groups.filter((g) =>
    g.agents.some((a) => a === botLower),
  );
  const fallbackGroups = matchedGroups.length
    ? matchedGroups
    : groups.filter((g) => g.agents.includes("*"));
  if (!fallbackGroups.length) return true;

  // Compile each pattern into a regex; collect (pattern-length, allow, regex).
  const matched: Array<{ len: number; allow: boolean }> = [];
  const path = target.pathname + (target.search || "");
  for (const g of fallbackGroups) {
    for (const r of g.rules) {
      if (r.pattern === "") {
        // Empty Disallow means "allow everything"; empty Allow is a no-op.
        if (!r.allow) matched.push({ len: 0, allow: true });
        continue;
      }
      const re = robotsPatternToRegex(r.pattern);
      if (re.test(path)) matched.push({ len: r.pattern.length, allow: r.allow });
    }
  }
  if (!matched.length) return true;
  // Longest-match wins; Allow wins ties.
  matched.sort((a, b) => (b.len - a.len) || (a.allow ? -1 : 1));
  return matched[0].allow;
}

function robotsPatternToRegex(pattern: string): RegExp {
  let out = "^";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") out += ".*";
    else if (ch === "$" && i === pattern.length - 1) out += "$";
    else out += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(out);
}

/* ---------- og:image inlining ---------- */

async function fetchCoverAsDataUri(
  imageUrl: string,
  baseUrl: URL,
): Promise<string> {
  let absolute: URL;
  try {
    absolute = new URL(imageUrl, baseUrl);
  } catch {
    return "";
  }
  if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_TIMEOUT_MS);
  try {
    const res = await fetch(absolute.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return absolute.toString(); // fall back to URL on upstream error
    const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ct.startsWith("image/")) return absolute.toString();
    const declaredLen = Number(res.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLen) && declaredLen > COVER_MAX_BYTES) {
      return absolute.toString(); // too big to inline; keep URL
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > COVER_MAX_BYTES) return absolute.toString();
    const bytes = new Uint8Array(buf);
    // btoa over chunks to avoid `Maximum call stack` on large strings.
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return `data:${ct};base64,${btoa(binary)}`;
  } catch {
    // Network / timeout / decode failure — still useful to return URL so the
    // card has *something* to display when the user is online.
    return absolute.toString();
  } finally {
    clearTimeout(timer);
  }
}

/** Walk a JSON-LD payload (object, array, or @graph) for `keywords` fields.
 *  JSON-LD is the only tag source — sites without it get an empty tags array. */
function collectJsonLdKeywords(node: unknown, out: string[], depth = 0): void {
  if (depth > 6 || node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdKeywords(item, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const kw = obj.keywords;
  if (typeof kw === "string") {
    for (const t of kw.split(/[,;|]/)) out.push(t);
  } else if (Array.isArray(kw)) {
    for (const t of kw) if (typeof t === "string") out.push(t);
  }
  // Recurse into the common containers.
  for (const key of ["@graph", "mainEntity", "about", "isPartOf"]) {
    if (key in obj) collectJsonLdKeywords(obj[key], out, depth + 1);
  }
}

/* ---------- head parsing (htmlparser2, replacing Cloudflare HTMLRewriter) ---------- */

interface HeadMeta {
  docTitle: string;
  ogTitle: string;
  metaDescription: string;
  ogDescription: string;
  ogImage: string;
  twitterImage: string;
  jsonLdBuffers: string[];
}

function parseHead(html: string): HeadMeta {
  const m: HeadMeta = {
    docTitle: "",
    ogTitle: "",
    metaDescription: "",
    ogDescription: "",
    ogImage: "",
    twitterImage: "",
    jsonLdBuffers: [],
  };

  let inHead = true; // matches source: capture only within <head>
  let capturingTitle = false;
  let currentJsonLd: string | null = null;

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (!inHead) return;
        if (name === "title") {
          capturingTitle = true;
        } else if (name === "meta") {
          const property = attribs.property ?? "";
          const metaName = attribs.name ?? "";
          const content = attribs.content ?? "";
          if (property === "og:title") m.ogTitle = content;
          else if (metaName === "description") m.metaDescription = content;
          else if (property === "og:description") m.ogDescription = content;
          else if (
            (property === "og:image" || property === "og:image:url") &&
            !m.ogImage
          ) {
            m.ogImage = content;
          } else if (metaName === "twitter:image" && !m.twitterImage) {
            m.twitterImage = content;
          }
        } else if (
          name === "script" &&
          (attribs.type ?? "").toLowerCase() === "application/ld+json"
        ) {
          currentJsonLd = "";
        }
      },
      ontext(text) {
        if (capturingTitle && inHead) m.docTitle += text;
        if (currentJsonLd !== null) currentJsonLd += text;
      },
      onclosetag(name) {
        if (name === "title") {
          capturingTitle = false;
        } else if (name === "script" && currentJsonLd !== null) {
          m.jsonLdBuffers.push(currentJsonLd);
          currentJsonLd = null;
        } else if (name === "head") {
          inHead = false;
        }
      },
    },
    // decodeEntities:false mirrors HTMLRewriter handing us raw entities, which
    // our decodeEntities()/cleanInline()/normalizeTag() then decode.
    { decodeEntities: false },
  );

  parser.write(html);
  parser.end();
  return m;
}

export async function POST(request: Request): Promise<Response> {
  if (!(await requireOwner())) return unauthorized();

  let body: { url?: unknown } = {};
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!rawUrl) return jsonResponse({ error: "Missing url." }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return jsonResponse({ error: "Invalid URL." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return jsonResponse({ error: "Only http(s) URLs are supported." }, { status: 400 });
  }

  // Respect robots.txt before touching the origin. Failures default to allow.
  if (!(await isAllowedByRobots(parsed))) {
    return jsonResponse(
      { error: "robots.txt disallows this URL for the catalogue bot." },
      { status: 403 },
    );
  }

  // Fetch with timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Upstream fetch timed out."
      : `Upstream fetch failed: ${err instanceof Error ? err.message : String(err)}`;
    return jsonResponse({ error: msg }, { status: 502 });
  }
  clearTimeout(timeout);

  if (!upstream.ok) {
    return jsonResponse(
      { error: `Upstream returned ${upstream.status}.` },
      { status: 502 },
    );
  }
  const ct = upstream.headers.get("content-type") ?? "";
  if (!ct.includes("html") && !ct.includes("xml")) {
    return jsonResponse(
      { error: `Unsupported content-type: ${ct || "unknown"}.` },
      { status: 502 },
    );
  }

  let html: string;
  try {
    html = await upstream.text();
  } catch (err) {
    return jsonResponse(
      { error: `Failed to read upstream body: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  let head: HeadMeta;
  try {
    head = parseHead(html);
  } catch (err) {
    return jsonResponse(
      { error: `HTML parse failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  const title = cleanInline(head.ogTitle || head.docTitle, MAX_TITLE);
  const description = cleanInline(head.ogDescription || head.metaDescription, MAX_DESCRIPTION);

  // Tags come exclusively from JSON-LD `keywords`. Pages that don't ship
  // JSON-LD (or ship it without `keywords`) get an empty array — the form
  // surfaces no chips and the user can type their own if they want.
  const jsonLdTags: string[] = [];
  for (const raw of head.jsonLdBuffers) {
    try {
      // Strip leading BOM and HTML comments some sites wrap JSON-LD in.
      const cleaned = raw.replace(/^﻿/, "").replace(/^\s*<!--|-->\s*$/g, "").trim();
      if (!cleaned) continue;
      collectJsonLdKeywords(JSON.parse(cleaned), jsonLdTags);
    } catch {
      /* skip malformed blob */
    }
  }

  const tags = dedupe(jsonLdTags);

  // og:image first, twitter:image as fallback. Either may be relative.
  const coverCandidate = (head.ogImage || head.twitterImage).trim();
  const cover = coverCandidate
    ? await fetchCoverAsDataUri(coverCandidate, parsed)
    : "";

  const result: MetaResponse = { title, description, tags, cover };
  return jsonResponse(result);
}
