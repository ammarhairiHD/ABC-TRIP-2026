import { Router } from "express";
import { env } from "cloudflare:workers";
import { buildMediaUrls, type MediaType } from "../media-urls.js";

export const sceneryRouter = Router();

interface SceneryRow {
  id: string;
  type: MediaType;
  day_id: number | null;
  width: number;
  height: number;
  blurhash: string | null;
}

sceneryRouter.get("/scenery", async (_req, res) => {
  // day_id is null until Ammar assigns one (abc-face-tools publishes scenery
  // items day-less, seq holding a filename-based fallback order in that case
  // -- see abc-face-tools' model.py). Those sort after every dated item,
  // in filename order.
  const { results } = await env.DB.prepare(
    `SELECT id, type, day_id, width, height, blurhash
       FROM media
      WHERE category = 'scenery' AND hidden = 0
      ORDER BY (day_id IS NULL), day_id, seq`
  ).all<SceneryRow>();

  res.json({
    media: results.map((row) => ({
      id: row.id,
      type: row.type,
      dayId: row.day_id,
      width: row.width,
      height: row.height,
      blurhash: row.blurhash,
      ...buildMediaUrls(env.MEDIA_BASE_URL, row.id, row.type),
    })),
  });
});
