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

interface JourneyMomentRow {
  id: string;
  day_id: number;
  kind: string;
  sort_order: number | null;
}

journeyRouter.get("/journey", async (_req, res) => {
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.date, d.altitude_m, d.half, d.cover_media_id, cm.type AS cover_media_type,
            (SELECT COUNT(*) FROM media m WHERE m.day_id = d.id AND m.hidden = 0) AS media_count
       FROM days d
       LEFT JOIN media cm ON cm.id = d.cover_media_id AND cm.hidden = 0
      ORDER BY d.id`
  ).all<DayRow>();

  // Fetched flat (not per-day) and grouped below, so the /climb path can be
  // built from a single request instead of one round trip per day.
  const { results: momentRows } = await env.DB.prepare(
    `SELECT id, day_id, kind, sort_order FROM moments ORDER BY day_id, sort_order`
  ).all<JourneyMomentRow>();

  const momentsByDay = new Map<number, { id: string; kind: string; sortOrder: number | null }[]>();
  for (const row of momentRows) {
    const list = momentsByDay.get(row.day_id) ?? [];
    list.push({ id: row.id, kind: row.kind, sortOrder: row.sort_order });
    momentsByDay.set(row.day_id, list);
  }

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
    moments: momentsByDay.get(row.id) ?? [],
  }));

  const totals = {
    days: days.length,
    media: days.reduce((sum, day) => sum + day.mediaCount, 0),
  };

  res.json({ days, totals });
});
