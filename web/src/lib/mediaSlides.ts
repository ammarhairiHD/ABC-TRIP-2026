/** The fields the day-page grid and the person-page grid both have, whatever
 * else differs between their two API responses (e.g. only day media carries
 * `faces`). Shared by MediaGrid and the lightbox-slide builder below. */
export interface MediaLike {
  id: string;
  type: "photo" | "video";
  width: number;
  height: number;
  blurhash: string | null;
  thumbUrl: string;
  webUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
}

export function buildLightboxSlides(media: readonly MediaLike[]) {
  return media.map((item) =>
    item.type === "video"
      ? {
          type: "video" as const,
          width: item.width,
          height: item.height,
          poster: item.posterUrl ?? undefined,
          sources: item.videoUrl ? [{ src: item.videoUrl, type: "video/mp4" }] : [],
          muted: true,
          controls: true,
          playsInline: true,
        }
      : { src: item.webUrl ?? item.thumbUrl, width: item.width, height: item.height }
  );
}
