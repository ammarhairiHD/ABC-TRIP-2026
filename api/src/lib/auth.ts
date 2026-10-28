import type { NextFunction, Request, Response } from "express";
import { env } from "cloudflare:workers";
import { unauthorized } from "./errors.js";

export interface TokenPayload {
  scope: string;
  exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function hmacKey(secret: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/**
 * Signs {scope, exp} as base64url(payload).base64url(HMAC-SHA256 signature).
 * Deliberately not a JWT library: a two-field payload needs none of a JWT's
 * header/algorithm negotiation, which is also where most real-world JWT bugs
 * (alg confusion, "alg: none") come from.
 */
export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const key = await hmacKey(new TextEncoder().encode(secret));
  const signature = await crypto.subtle.sign("HMAC", key, payloadBytes);
  return `${toBase64Url(payloadBytes)}.${toBase64Url(new Uint8Array(signature))}`;
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

/**
 * `crypto.subtle.verify` compares the signature in constant time internally
 * -- that's why this calls it on the raw signed bytes instead of re-deriving
 * a signature with `sign` and comparing strings by hand, which would leak
 * timing information byte by byte.
 */
export async function verifyToken(token: string, secret: string): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed" };
  }
  const [payloadPart, signaturePart] = parts;

  let payloadBytes: Uint8Array;
  let payload: TokenPayload;
  try {
    payloadBytes = fromBase64Url(payloadPart);
    payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.scope !== "string" || typeof payload.exp !== "number") {
    return { ok: false, reason: "malformed" };
  }

  const key = await hmacKey(new TextEncoder().encode(secret));
  const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(signaturePart), payloadBytes);
  if (!valid) return { ok: false, reason: "bad-signature" };
  if (payload.exp <= Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

/**
 * Code-hash secrets (EDITOR_CODE_HASH, DOWNLOAD_CODE_HASH) are stored as
 * "<saltHex>:<hmacHex>" -- see scripts/generate-unlock-code.mjs.
 * Salted HMAC-SHA256, not PBKDF2: Workers' free-plan CPU-time limit is too
 * small for a slow hash, so this leans on the code being long and random
 * (never a human-chosen password) plus the rate limit in routes/unlock.ts.
 * `subtle.verify` again gives the constant-time comparison for free.
 */
export async function verifyCode(code: string, codeHashSecret: string): Promise<boolean> {
  const [saltHex, expectedHex] = codeHashSecret.split(":");
  if (!saltHex || !expectedHex) return false;
  const key = await hmacKey(fromHex(saltHex));
  return crypto.subtle.verify("HMAC", key, fromHex(expectedHex), new TextEncoder().encode(code));
}

/**
 * Signs a single-id, single-use download link good for 60 seconds:
 * base64url(HMAC-SHA256(secret, "<id>:<exp>")). Deliberately separate from
 * signToken -- the long-lived (24h) download-scope token from /api/unlock
 * never goes in a URL; it's only ever sent as an Authorization header to
 * mint one of these short-lived signatures per file, which is what
 * actually appears in the GET /api/download/:id link. The ":" matters: id
 * is a hex content hash so it can never contain one, which keeps two
 * different (id, exp) pairs from ever signing the same string.
 */
export async function signDownloadLink(id: string, exp: number, secret: string): Promise<string> {
  const key = await hmacKey(new TextEncoder().encode(secret));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}:${exp}`));
  return toBase64Url(new Uint8Array(signature));
}

/** `subtle.verify` gives the constant-time comparison, same reasoning as
 * verifyToken/verifyCode above. */
export async function verifyDownloadLink(id: string, exp: number, sig: string, secret: string): Promise<boolean> {
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
  let sigBytes: Uint8Array;
  try {
    sigBytes = fromBase64Url(sig);
  } catch {
    return false;
  }
  const key = await hmacKey(new TextEncoder().encode(secret));
  return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(`${id}:${exp}`));
}

/** Express middleware: 401s unless Authorization is a Bearer token, signed
 * with TOKEN_SECRET, unexpired, and scoped to exactly `scope`. */
export function requireScope(scope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    if (!token) {
      unauthorized(res, "missing token");
      return;
    }
    const result = await verifyToken(token, env.TOKEN_SECRET);
    if (!result.ok || result.payload.scope !== scope) {
      unauthorized(res, "invalid or expired token");
      return;
    }
    next();
  };
}
