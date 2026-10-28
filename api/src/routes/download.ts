import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { Router } from "express";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { buildOriginalKey, type MediaType } from "../media-urls.js";
import { requireScope, signDownloadLink, verifyDownloadLink } from "../lib/auth.js";
import { badRequest, notFound, tooManyRequests, unauthorized } from "../lib/errors.js";

export const downloadRouter = Router();

const mediaIdSchema = z.string().min(1).regex(/^[a-f0-9]+$/i);

// Ships dark: DOWNLOADS_ENABLED (api/wrangler.jsonc var) defaults to "false"
// in every environment until Ammar is ready to hand out the code, at which
// point both routes below start answering instead of 404ing.
function downloadsEnabled(): boolean {
  // Widened through a `string`-typed local: wrangler types DOWNLOADS_ENABLED
  // as the literal "false" (today's wrangler.jsonc default), which would
  // otherwise make `=== "true"` a compile error once Ammar flips it.
  const value: string = env.DOWNLOADS_ENABLED;
  return value === "true";
}

const LINK_TTL_SECONDS = 60;

/**
 * Mints a signed, single-id, 60s link for GET /download/:id below. Requires
 * the long-lived (24h) "download" token from /api/unlock as a header --
 * that token never appears in a URL; only the short-lived signature this
 * issues does. Rate-limited (not the GET below): a leaked/long-lived token
 * being used to mint links rapidly is the throughput risk here, not
 * brute-forcing an HMAC.
 */
downloadRouter.post("/download/:id/link", requireScope("download"), async (req, res) => {
  if (!downloadsEnabled()) {
    notFound(res, "not found");
    return;
  }

  const idParsed = mediaIdSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    badRequest(res, "invalid media id");
    return;
  }
  const id = idParsed.data;

  const ip = req.headers["cf-connecting-ip"];
  const clientIp = typeof ip === "string" && ip.length > 0 ? ip : "unknown";
  const { success } = await env.DOWNLOAD_LINK_LIMITER.limit({ key: clientIp });
  if (!success) {
    tooManyRequests(res, "too many requests, try again in a minute");
    return;
  }

  const media = await env.DB.prepare(`SELECT id FROM media WHERE id = ? AND hidden = 0`).bind(id).first();
  if (!media) {
    notFound(res, "not found");
    return;
  }

  const exp = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  const sig = await signDownloadLink(id, exp, env.TOKEN_SECRET);
  res.json({ url: `/api/download/${id}?exp=${exp}&sig=${sig}` });
});

interface OriginalRow {
  id: string;
  type: MediaType;
}

downloadRouter.get("/download/:id", async (req, res) => {
  if (!downloadsEnabled()) {
    notFound(res, "not found");
    return;
  }

  const idParsed = mediaIdSchema.safeParse(req.params.id);
  const expRaw = req.query.exp;
  const sigRaw = req.query.sig;
  const exp = typeof expRaw === "string" ? Number(expRaw) : NaN;
  const sig = typeof sigRaw === "string" ? sigRaw : null;
  if (!idParsed.success || !sig) {
    badRequest(res, "missing or invalid parameters");
    return;
  }
  const id = idParsed.data;

  if (!(await verifyDownloadLink(id, exp, sig, env.TOKEN_SECRET))) {
    unauthorized(res, "invalid or expired link");
    return;
  }

  // Re-checked here, not trusted from link-issuance: belt and suspenders,
  // same reasoning as every other route's own hidden=0 check.
  const media = await env.DB.prepare(`SELECT id, type FROM media WHERE id = ? AND hidden = 0`)
    .bind(id)
    .first<OriginalRow>();
  if (!media) {
    notFound(res, "not found");
    return;
  }

  const object = await env.ORIGINALS.get(buildOriginalKey(media.id, media.type));
  if (!object) {
    notFound(res, "not found");
    return;
  }

  const ext = media.type === "video" ? "mp4" : "jpg";
  res.set("Content-Type", object.httpMetadata?.contentType ?? (media.type === "video" ? "video/mp4" : "image/jpeg"));
  res.set("Content-Disposition", object.httpMetadata?.contentDisposition ?? `attachment; filename="ABC-Trip-${media.id}.${ext}"`);
  res.set("Content-Length", String(object.size));
  // Token-gated original, link good for 60s -- never cached by any
  // intermediary (unlike the content-hashed, immutable MEDIA bucket URLs).
  res.set("Cache-Control", "private, no-store");

  Readable.fromWeb(object.body as unknown as NodeWebReadableStream).pipe(res);
});
