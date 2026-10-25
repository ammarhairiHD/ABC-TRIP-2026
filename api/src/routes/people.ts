import { Router } from "express";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { buildMediaUrls, type MediaType } from "../media-urls.js";
import { badRequest, notFound } from "../lib/errors.js";
import { isHiddenPersonId } from "../lib/guard.js";

export const peopleRouter = Router();

const personIdSchema = z.string().min(1).regex(/^[a-z0-9-]+$/);

interface PersonListRow {
  id: string;
  nickname: string;
  role: string;
  media_count: number;
  first_media_id: string | null;
  first_media_type: MediaType | null;
  face_x: number | null;
  face_y: number | null;
  face_w: number | null;
  face_h: number | null;
}

peopleRouter.get("/people", async (_req, res) => {
  // GROUP BY collapses any media_faces rows beyond the first for the same
  // (first_media_id, person) pair -- e.g. a person detected in several frames
  // of the same video -- back down to one avatar row per person.
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.nickname, p.role, p.media_count, p.first_media_id, m.type AS first_media_type,
            MIN(mf.x) AS face_x, MIN(mf.y) AS face_y, MIN(mf.w) AS face_w, MIN(mf.h) AS face_h
       FROM people p
       LEFT JOIN media m ON m.id = p.first_media_id AND m.hidden = 0
       LEFT JOIN media_faces mf ON mf.media_id = p.first_media_id AND mf.person_id = p.id
      WHERE p.hidden = 0 AND p.id != 'simran'
      GROUP BY p.id
      ORDER BY p.sort_order`
  ).all<PersonListRow>();

  const people = results.map((row) => {
    const avatar =
      row.first_media_id && row.first_media_type
        ? {
            thumbUrl: buildMediaUrls(env.MEDIA_BASE_URL, row.first_media_id, row.first_media_type).thumbUrl,
            box:
              row.face_x !== null && row.face_y !== null && row.face_w !== null && row.face_h !== null
                ? { x: row.face_x, y: row.face_y, w: row.face_w, h: row.face_h }
                : null,
          }
        : null;

    return {
      id: row.id,
      nickname: row.nickname,
      role: row.role,
      mediaCount: row.media_count,
      avatar,
    };
  });

  res.json({ people });
});

interface PersonRow {
  id: string;
  nickname: string;
  media_count: number;
  days_present: string | null;
  most_with: string | null;
}

interface PersonMediaRow {
  id: string;
  type: MediaType;
  day_id: number;
  seq: number | null;
  category: string;
  width: number;
  height: number;
  duration_s: number | null;
  blurhash: string | null;
}

interface NicknameRow {
  id: string;
  nickname: string;
}

peopleRouter.get("/people/:id", async (req, res) => {
  const parsed = personIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    badRequest(res, "person id must be a lowercase slug");
    return;
  }
  const id = parsed.data;

  if (isHiddenPersonId(id)) {
    notFound(res, `person ${id} not found`);
    return;
  }

  const person = await env.DB.prepare(
    `SELECT id, nickname, media_count, days_present, most_with
       FROM people
      WHERE id = ? AND hidden = 0`
  )
    .bind(id)
    .first<PersonRow>();

  if (!person) {
    notFound(res, `person ${id} not found`);
    return;
  }

  const mostWithRaw = (person.most_with ? JSON.parse(person.most_with) : []) as Array<{
    id: string;
    count: number;
  }>;

  let mostWith: Array<{ id: string; nickname: string; count: number }> = [];
  if (mostWithRaw.length > 0) {
    const placeholders = mostWithRaw.map(() => "?").join(",");
    const { results: nicknameRows } = await env.DB.prepare(
      `SELECT id, nickname FROM people WHERE id IN (${placeholders}) AND hidden = 0 AND id != 'simran'`
    )
      .bind(...mostWithRaw.map((entry) => entry.id))
      .all<NicknameRow>();
    const nicknameById = new Map(nicknameRows.map((row) => [row.id, row.nickname]));

    mostWith = mostWithRaw
      .filter((entry) => nicknameById.has(entry.id))
      .map((entry) => ({ id: entry.id, nickname: nicknameById.get(entry.id)!, count: entry.count }));
  }

  const { results: mediaRows } = await env.DB.prepare(
    `SELECT m.id, m.type, m.day_id, m.seq, m.category, m.width, m.height, m.duration_s, m.blurhash
       FROM media m
      WHERE m.hidden = 0
        AND EXISTS (SELECT 1 FROM media_faces mf WHERE mf.media_id = m.id AND mf.person_id = ?)
      ORDER BY m.day_id, m.seq`
  )
    .bind(id)
    .all<PersonMediaRow>();

  const media = mediaRows.map((row) => ({
    id: row.id,
    type: row.type,
    dayId: row.day_id,
    seq: row.seq,
    category: row.category,
    width: row.width,
    height: row.height,
    durationS: row.duration_s,
    blurhash: row.blurhash,
    ...buildMediaUrls(env.MEDIA_BASE_URL, row.id, row.type),
  }));

  res.json({
    person: {
      id: person.id,
      nickname: person.nickname,
      mediaCount: person.media_count,
      daysPresent: person.days_present ? JSON.parse(person.days_present) : [],
      mostWith,
    },
    media,
  });
});
