import { Router } from "express";
import { env } from "cloudflare:workers";
import { buildMediaUrls, type MediaType } from "../media-urls.js";

export const journeyRouter = Router();

interface DayRow {
  id: number;
  date: string;
  altitude_m: number | null;
  half: string;
  cover_media_id: string | null;
  cover_media_type: MediaType | null;
  media_count: number;
}

journeyRouter.get("/journey", async (_req, res) => {
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.date, d.altitude_m, d.half, d.cover_media_id, cm.type AS cover_media_type,
            (SELECT COUNT(*) FROM media m WHERE m.day_id = d.id AND m.hidden = 0) AS media_count
       FROM days d
       LEFT JOIN media cm ON cm.id = d.cover_media_id AND cm.hidden = 0
      ORDER BY d.id`
  ).all<DayRow>();

  const days = results.map((row) => ({
    id: row.id,
    date: row.date,
    altitudeM: row.altitude_m,
    half: row.half,
    mediaCount: row.media_count,
    coverThumbUrl:
      row.cover_media_id && row.cover_media_type
        ? buildMediaUrls(env.MEDIA_BASE_URL, row.cover_media_id, row.cover_media_type).thumbUrl
        : null,
  }));

  const totals = {
    days: days.length,
    media: days.reduce((sum, day) => sum + day.mediaCount, 0),
  };

  res.json({ days, totals });
});
