export type MediaType = "photo" | "video";

export interface MediaUrls {
  thumbUrl: string;
  webUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
}

/**
 * media rows store no file paths (see api/migrations/0001_init.sql comment on
 * the media table): keys are derived from id + type, matching the layout
 * abc-face-tools' prepare.py/video.py always write to media/out/.
 */
export function buildMediaUrls(base: string, id: string, type: MediaType): MediaUrls {
  const root = base.replace(/\/+$/, "");
  if (type === "video") {
    return {
      thumbUrl: `${root}/thumbs/${id}.webp`,
      webUrl: null,
      videoUrl: `${root}/video/${id}.mp4`,
      posterUrl: `${root}/posters/${id}.jpg`,
    };
  }
  return {
    thumbUrl: `${root}/thumbs/${id}.webp`,
    webUrl: `${root}/web/${id}.webp`,
    videoUrl: null,
    posterUrl: null,
  };
}

/**
 * Moment-card hero preview: an ~8s/480p/muted clip made by abc-face-tools'
 * publish/preview_clips.py for any moment whose hero is a video (key pattern
 * `video/{id}-preview.mp4`, not stored in D1 since it's a pure function of
 * the media id). null for photo heroes, which just show the still image.
 */
export function buildPreviewClipUrl(base: string, id: string, type: MediaType): string | null {
  if (type !== "video") return null;
  const root = base.replace(/\/+$/, "");
  return `${root}/video/${id}-preview.mp4`;
}
