import { Router } from "express";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { buildMediaUrls, type MediaType } from "../media-urls.js";
import { badRequest, notFound } from "../lib/errors.js";

export const daysRouter = Router();

const dayParamsSchema = z.object({
  n: z.coerce.number().int().positive(),
});

interface DayRow {
  id: number;
  date: string;
  altitude_m: number | null;
  half: string;
}

interface DayPersonRow {
  id: string;
  nickname: string;
  media_count: number;
}

daysRouter.get("/days/:n", async (req, res) => {
  const parsed = dayParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    badRequest(res, "day must be a positive integer");
    return;
  }
  const { n } = parsed.data;

  const day = await env.DB.prepare(`SELECT id, date, altitude_m, half FROM days WHERE id = ?`)
    .bind(n)
    .first<DayRow>();

  if (!day) {
    notFound(res, `day ${n} not found`);
    return;
  }

  const { results: people } = await env.DB.prepare(
    `SELECT p.id, p.nickname, COUNT(DISTINCT mf.media_id) AS media_count
       FROM media_faces mf
       JOIN people p ON p.id = mf.person_id AND p.hidden = 0 AND p.id != 'simran'
       JOIN media m ON m.id = mf.media_id AND m.hidden = 0
      WHERE m.day_id = ?
      GROUP BY p.id
      ORDER BY media_count DESC, p.sort_order`
  )
    .bind(n)
    .all<DayPersonRow>();

  res.json({
    day: { id: day.id, date: day.date, altitudeM: day.altitude_m, half: day.half },
    people: people.map((row) => ({ id: row.id, nickname: row.nickname, mediaCount: row.media_count })),
  });
});

interface MediaFaceRow {
  id: string;
  type: MediaType;
  seq: number | null;
  category: string;
  width: number;
  height: number;
  duration_s: number | null;
  blurhash: string | null;
  person_id: string | null;
  nickname: string | null;
  face_x: number | null;
  face_y: number | null;
  face_w: number | null;
  face_h: number | null;
  face_t_s: number | null;
  face_confidence: number | null;
}

daysRouter.get("/days/:n/media", async (req, res) => {
  const parsed = dayParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    badRequest(res, "day must be a positive integer");
    return;
  }
  const { n } = parsed.data;

  const day = await env.DB.prepare(`SELECT id, date, altitude_m, half FROM days WHERE id = ?`)
    .bind(n)
    .first<DayRow>();

  if (!day) {
    notFound(res, `day ${n} not found`);
    return;
  }

  // One LEFT JOIN through media_faces -> people: a media row with no faces (or
  // only faces belonging to hidden people, e.g. Simran) comes back with the
  // face_* / person_id columns NULL and is dropped when building `faces` below.
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.type, m.seq, m.category, m.width, m.height, m.duration_s, m.blurhash,
            mf.person_id, p.nickname,
            mf.x AS face_x, mf.y AS face_y, mf.w AS face_w, mf.h AS face_h,
            mf.t_s AS face_t_s, mf.confidence AS face_confidence
       FROM media m
       LEFT JOIN media_faces mf ON mf.media_id = m.id
       LEFT JOIN people p ON p.id = mf.person_id AND p.hidden = 0 AND p.id != 'simran'
      WHERE m.day_id = ? AND m.hidden = 0
      ORDER BY m.seq, mf.id`
  )
    .bind(n)
    .all<MediaFaceRow>();

  const mediaById = new Map<
    string,
    {
      id: string;
      type: MediaType;
      seq: number | null;
      category: string;
      width: number;
      height: number;
      durationS: number | null;
      blurhash: string | null;
      thumbUrl: string;
      webUrl: string | null;
      videoUrl: string | null;
      posterUrl: string | null;
      faces: Array<{
        personId: string;
        nickname: string;
        x: number;
        y: number;
        w: number;
        h: number;
        tS: number | null;
        confidence: number | null;
      }>;
    }
  >();

  for (const row of results) {
    let media = mediaById.get(row.id);
    if (!media) {
      media = {
        id: row.id,
        type: row.type,
        seq: row.seq,
        category: row.category,
        width: row.width,
        height: row.height,
        durationS: row.duration_s,
        blurhash: row.blurhash,
        ...buildMediaUrls(env.MEDIA_BASE_URL, row.id, row.type),
        faces: [],
      };
      mediaById.set(row.id, media);
    }

    if (row.person_id && row.nickname) {
      media.faces.push({
        personId: row.person_id,
        nickname: row.nickname,
        x: row.face_x!,
        y: row.face_y!,
        w: row.face_w!,
        h: row.face_h!,
        tS: row.face_t_s,
        confidence: row.face_confidence,
      });
    }
  }

  res.json({
    day: { id: day.id, date: day.date, altitudeM: day.altitude_m, half: day.half },
    media: [...mediaById.values()],
  });
});
