import { Router } from "express";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { buildMediaUrls, type MediaType } from "../media-urls.js";
import { requireScope } from "../lib/auth.js";
import { badRequest, notFound } from "../lib/errors.js";

export const sceneryRouter = Router();

interface SceneryRow {
  id: string;
  type: MediaType;
  day_id: number | null;
  width: number;
  height: number;
  blurhash: string | null;
  caption: string | null;
}

sceneryRouter.get("/scenery", async (_req, res) => {
  // day_id is null until Ammar assigns one (abc-face-tools publishes scenery
  // items day-less, seq holding a filename-based fallback order in that case
  // -- see abc-face-tools' model.py). Those sort after every dated item,
  // in filename order. Captions come from scenery_captions, the one table
  // publish.py's import.sql never touches -- D1 is their only home.
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.type, m.day_id, m.width, m.height, m.blurhash, sc.text AS caption
       FROM media m
       LEFT JOIN scenery_captions sc ON sc.media_id = m.id
      WHERE m.category = 'scenery' AND m.hidden = 0
      ORDER BY (m.day_id IS NULL), m.day_id, m.seq`
  ).all<SceneryRow>();

  res.json({
    media: results.map((row) => ({
      id: row.id,
      type: row.type,
      dayId: row.day_id,
      width: row.width,
      height: row.height,
      blurhash: row.blurhash,
      caption: row.caption,
      ...buildMediaUrls(env.MEDIA_BASE_URL, row.id, row.type),
    })),
  });
});

const captionIdSchema = z.string().min(1).regex(/^[a-f0-9]+$/i);

const captionBodySchema = z.object({
  text: z.string().max(200),
});

function stripControlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1F\x7F]/g, "");
}

function wordCount(text: string): number {
  return text.length === 0 ? 0 : text.split(/\s+/).length;
}

sceneryRouter.put("/scenery/:id/caption", requireScope("scenery-editor"), async (req, res) => {
  const idParsed = captionIdSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    badRequest(res, "invalid media id");
    return;
  }
  const id = idParsed.data;

  const bodyParsed = captionBodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    badRequest(res, "text must be a string of at most 200 characters");
    return;
  }

  // Single line, plain text: control characters (including newlines) are
  // stripped before anything else, then the result is trimmed and word-
  // counted. An empty result after this means "delete the caption".
  const text = stripControlChars(bodyParsed.data.text).trim();
  if (wordCount(text) > 25) {
    badRequest(res, "caption must be 25 words or fewer");
    return;
  }

  const media = await env.DB.prepare(
    `SELECT id FROM media WHERE id = ? AND category = 'scenery' AND hidden = 0`
  )
    .bind(id)
    .first();
  if (!media) {
    notFound(res, `scenery item ${id} not found`);
    return;
  }

  if (text.length === 0) {
    await env.DB.prepare(`DELETE FROM scenery_captions WHERE media_id = ?`).bind(id).run();
    res.json({ id, caption: null });
    return;
  }

  const updatedAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO scenery_captions (media_id, text, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(media_id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`
  )
    .bind(id, text, updatedAt)
    .run();

  res.json({ id, caption: text });
});
