import { Router } from "express";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { buildMediaUrls, buildPreviewClipUrl, type MediaType } from "../media-urls.js";
import { badRequest, notFound } from "../lib/errors.js";

export const momentsRouter = Router();

const momentIdSchema = z.string().min(1).regex(/^[a-z0-9-]+$/);

interface MomentRow {
  id: string;
  day_id: number;
  kind: string;
  sort_order: number | null;
  hero_media_id: string | null;
  hero_type: MediaType | null;
  hero_width: number | null;
  hero_height: number | null;
  hero_blurhash: string | null;
}

interface MomentMediaFaceRow {
  media_id: string;
  type: MediaType;
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

momentsRouter.get("/moments/:id", async (req, res) => {
  const parsed = momentIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    badRequest(res, "moment id must be a lowercase slug");
    return;
  }
  const id = parsed.data;

  const moment = await env.DB.prepare(
    `SELECT mo.id, mo.day_id, mo.kind, mo.sort_order, mo.hero_media_id,
            hm.type AS hero_type, hm.width AS hero_width, hm.height AS hero_height,
            hm.blurhash AS hero_blurhash
       FROM moments mo
       LEFT JOIN media hm ON hm.id = mo.hero_media_id AND hm.hidden = 0
      WHERE mo.id = ?`
  )
    .bind(id)
    .first<MomentRow>();

  if (!moment) {
    notFound(res, `moment ${id} not found`);
    return;
  }

  // moment_media has no explicit order column -- rows are inserted by
  // publish.py in the hand-picked order from moments.json, so ordering by
  // rowid (SQLite's implicit insertion-order key) reproduces that order.
  // Same LEFT JOIN through media_faces -> people as /days/:n/media: a media
  // row with no visible faces comes back with person_id/face_* NULL.
  const { results } = await env.DB.prepare(
    `SELECT mm.media_id, m.type, m.width, m.height, m.duration_s, m.blurhash,
            mf.person_id, p.nickname,
            mf.x AS face_x, mf.y AS face_y, mf.w AS face_w, mf.h AS face_h,
            mf.t_s AS face_t_s, mf.confidence AS face_confidence
       FROM moment_media mm
       JOIN media m ON m.id = mm.media_id AND m.hidden = 0
       LEFT JOIN media_faces mf ON mf.media_id = m.id
       LEFT JOIN people p ON p.id = mf.person_id AND p.hidden = 0 AND p.id != 'simran'
      WHERE mm.moment_id = ?
      ORDER BY mm.rowid, mf.id`
  )
    .bind(id)
    .all<MomentMediaFaceRow>();

  const mediaById = new Map<
    string,
    {
      id: string;
      type: MediaType;
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
  const peopleById = new Map<string, string>();

  for (const row of results) {
    let media = mediaById.get(row.media_id);
    if (!media) {
      media = {
        id: row.media_id,
        type: row.type,
        width: row.width,
        height: row.height,
        durationS: row.duration_s,
        blurhash: row.blurhash,
        ...buildMediaUrls(env.MEDIA_BASE_URL, row.media_id, row.type),
        faces: [],
      };
      mediaById.set(row.media_id, media);
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
      peopleById.set(row.person_id, row.nickname);
    }
  }

  res.json({
    moment: {
      id: moment.id,
      dayId: moment.day_id,
      kind: moment.kind,
      sortOrder: moment.sort_order,
      heroMediaId: moment.hero_media_id,
    },
    hero:
      moment.hero_media_id && moment.hero_type
        ? {
            id: moment.hero_media_id,
            type: moment.hero_type,
            width: moment.hero_width,
            height: moment.hero_height,
            blurhash: moment.hero_blurhash,
            ...buildMediaUrls(env.MEDIA_BASE_URL, moment.hero_media_id, moment.hero_type),
            previewClipUrl: buildPreviewClipUrl(env.MEDIA_BASE_URL, moment.hero_media_id, moment.hero_type),
          }
        : null,
    media: [...mediaById.values()],
    people: [...peopleById.entries()].map(([personId, nickname]) => ({ id: personId, nickname })),
  });
});
