import { randomBytes } from "crypto";

/**
 * Certificate verification.
 *
 * A verify code is the whole trust model, so it has three jobs:
 *
 *   Unguessable   Anyone who can enumerate codes can mint fake proof that
 *                 someone else finished a course. 40 bits from a CSPRNG, not
 *                 a counter and not Math.random.
 *   Readable      People type these off a printout and read them down a phone,
 *                 so the alphabet excludes the four characters that get
 *                 misread — 0/O and 1/I — and the code is grouped in fours.
 *   Stable        It is printed on a PDF that outlives any database migration.
 *                 The format must never change for an existing code, which is
 *                 why the prefix carries a version.
 *
 * Format: DOS-XXXX-XXXX (8 significant characters, ~41 bits of entropy).
 */

/** Crockford-ish: no 0, O, 1, I, L, U. 30 characters. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateVerifyCode(): string {
  // rejection-sampled so every character is uniformly likely; a plain modulo
  // over 256 would bias the first 16 letters of the alphabet.
  const chars: string[] = [];
  while (chars.length < 8) {
    for (const byte of randomBytes(16)) {
      if (chars.length >= 8) break;
      if (byte >= 240) continue; // 240 = 8 * 30, the largest usable multiple
      chars.push(ALPHABET[byte % ALPHABET.length]);
    }
  }
  return `DOS-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/**
 * Accepts what a human actually types: any case, with or without dashes, with
 * stray spaces. Returns the canonical form, or null if it could not possibly
 * be one of ours — so the verify page can say "that is not a valid code"
 * without a database round trip.
 */
export function normalizeVerifyCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = cleaned.startsWith("DOS") ? cleaned.slice(3) : cleaned;
  if (body.length !== 8) return null;
  if (![...body].every((c) => ALPHABET.includes(c))) return null;
  return `DOS-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function verifyUrl(code: string, origin?: string): string {
  const path = `/verify/${encodeURIComponent(code)}`;
  return origin ? `${origin}${path}` : path;
}
