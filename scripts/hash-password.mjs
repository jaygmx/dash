#!/usr/bin/env node
/**
 * Generate a bcrypt hash for the credentials ("custom") login.
 *
 * The owner signs in with AUTH_OWNER_EMAIL + a password; the server stores only
 * the bcrypt hash of that password in AUTH_PASSWORD_HASH (never the plaintext).
 *
 * Usage:
 *   node scripts/hash-password.mjs 'my-new-password'   # hash an explicit value
 *   node scripts/hash-password.mjs                     # hash $EDIT_PASSCODE
 *                                                       # (read from .env.local)
 *
 * Prints ONLY the hash to stdout, so it is safe to capture:
 *   AUTH_PASSWORD_HASH=$(node scripts/hash-password.mjs 'pw')
 */

import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

// Load .env.local so the no-arg form can hash the existing EDIT_PASSCODE.
try {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
} catch {
  /* no .env.local */
}

const password = process.argv[2] ?? process.env.EDIT_PASSCODE;
if (!password) {
  console.error(
    "No password given. Pass one as an argument, or set EDIT_PASSCODE in .env.local.",
  );
  process.exit(1);
}

// cost 12 — matches the pkm reference; ~hundreds of ms per verify.
process.stdout.write(bcrypt.hashSync(password, 12) + "\n");
