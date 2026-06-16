import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAllowedEmail, allowedEmails } from "@/lib/server/allowlist";
import { normalizeAppearance, DEFAULT_APPEARANCE } from "@/lib/appearance";
import {
  normalizeDrawers,
  validateNewDrawer,
  slugify,
  deriveCode,
  DEFAULT_DRAWERS,
} from "@/lib/drawers";
import { withPresets } from "@/lib/storage";
import { normalizeUrl, hostnameOf, generateClassification } from "@/lib/storage";
import { PRESET_BOOKMARKS } from "@/lib/presets";

describe("oauth allowlist", () => {
  // Origin: OAuth (GitHub/Google) sign-ins must be gated to the owner; an
  // empty/missing list must admit nobody (fail closed).
  const saved = process.env.AUTH_ALLOWED_EMAILS;
  afterEach(() => {
    if (saved === undefined) delete process.env.AUTH_ALLOWED_EMAILS;
    else process.env.AUTH_ALLOWED_EMAILS = saved;
  });

  it("fails closed when unset", () => {
    delete process.env.AUTH_ALLOWED_EMAILS;
    expect(allowedEmails()).toEqual([]);
    expect(isAllowedEmail("a@b.com")).toBe(false);
  });

  it("matches case-insensitively and trims both sides", () => {
    process.env.AUTH_ALLOWED_EMAILS = "Owner@Example.com, second@x.io ";
    expect(isAllowedEmail("owner@example.com")).toBe(true);
    expect(isAllowedEmail("  SECOND@X.IO ")).toBe(true);
    expect(isAllowedEmail("nope@x.io")).toBe(false);
  });

  it("rejects empty / null / undefined", () => {
    process.env.AUTH_ALLOWED_EMAILS = "a@b.com";
    expect(isAllowedEmail("")).toBe(false);
    expect(isAllowedEmail(null)).toBe(false);
    expect(isAllowedEmail(undefined)).toBe(false);
  });
});

describe("appearance normalization", () => {
  it("falls back to defaults for junk", () => {
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ theme: "nope", font: "nope" })).toEqual(DEFAULT_APPEARANCE);
  });
  it("keeps valid keys", () => {
    expect(normalizeAppearance({ theme: "ocean", font: "bauhaus" })).toEqual({
      theme: "ocean",
      font: "bauhaus",
    });
  });
});

describe("drawers", () => {
  it("slugify + deriveCode", () => {
    expect(slugify("My Cool Drawer!")).toBe("my-cool-drawer");
    expect(deriveCode("My Cool Drawer")).toBe("MC");
    expect(deriveCode("Tools")).toBe("TO");
  });
  it("validateNewDrawer enforces rules", () => {
    expect(validateNewDrawer({ label: "", code: "XX" }, DEFAULT_DRAWERS)).toMatch(/required/i);
    expect(validateNewDrawer({ label: "Personal", code: "XX" }, DEFAULT_DRAWERS)).toMatch(/already exists/i);
    expect(validateNewDrawer({ label: "Brand New", code: "PS" }, DEFAULT_DRAWERS)).toMatch(/already used/i);
    expect(validateNewDrawer({ label: "Brand New", code: "BN" }, DEFAULT_DRAWERS)).toBeNull();
  });
  it("normalizeDrawers always restores built-ins", () => {
    const out = normalizeDrawers([{ key: "x", label: "X", code: "XX" }]);
    for (const d of DEFAULT_DRAWERS) {
      expect(out.some((o) => o.key === d.key)).toBe(true);
    }
  });
});

describe("storage helpers", () => {
  it("withPresets merges without duplicating", () => {
    const merged = withPresets([]);
    expect(merged.length).toBe(PRESET_BOOKMARKS.length);
    const again = withPresets(merged);
    expect(again.length).toBe(PRESET_BOOKMARKS.length);
  });
  it("normalizeUrl + hostnameOf", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("http://x.com")).toBe("http://x.com");
    expect(hostnameOf("https://www.example.com/path")).toBe("example.com");
  });
  it("generateClassification is stable + formatted", () => {
    const a = generateClassification("TL", "abc123");
    expect(a).toBe(generateClassification("TL", "abc123"));
    expect(a).toMatch(/^TL · \d+\.\d+$/);
  });
});

describe("guard: meta route User-Agent must be ASCII (Latin-1 header)", () => {
  // Origin: a non-ASCII em-dash in USER_AGENT threw "Cannot convert argument
  // to a ByteString" under Node/undici fetch (Cloudflare tolerated it).
  it("meta/route.ts USER_AGENT line contains no non-ASCII", () => {
    const file = fileURLToPath(new URL("../../app/api/meta/route.ts", import.meta.url));
    const src = readFileSync(file, "utf8");
    const line = src.split("\n").find((l) => l.includes("personal-use meta fetcher"));
    expect(line, "USER_AGENT line not found").toBeTruthy();
    // eslint-disable-next-line no-control-regex
    expect(/^[\x00-\x7F]*$/.test(line!)).toBe(true);
  });
});
