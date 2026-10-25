import { useMemo, useState } from "react";
import { decode } from "blurhash";
import type { MediaLike } from "../lib/mediaSlides";
import { cn } from "../lib/utils";

const BLURHASH_SIZE = 8;

/** Tiny decoded-blurhash data URL, shown behind the real thumbnail until it loads. */
function useBlurhashDataUrl(hash: string | null): string | null {
  return useMemo(() => {
    if (!hash) return null;
    try {
      const pixels = decode(hash, BLURHASH_SIZE, BLURHASH_SIZE);
      const canvas = document.createElement("canvas");
      canvas.width = BLURHASH_SIZE;
      canvas.height = BLURHASH_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), BLURHASH_SIZE, BLURHASH_SIZE), 0, 0);
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }, [hash]);
}

/**
 * One grid tile. `loading="lazy"` defers the network fetch until the tile
 * nears the viewport; `content-visibility: auto` (set on the `aspect-square`
 * wrapper in DayPage, which is what gives this element a size) additionally
 * skips layout/paint for off-screen tiles, which is what keeps a 400+ item
 * grid scrolling smoothly. This button fills that wrapper exactly, so it
 * never needs its own size.
 */
export function MediaThumb({ media, onOpen }: { media: MediaLike; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const blurUrl = useBlurhashDataUrl(media.blurhash);

  return (
    <button
      onClick={onOpen}
      aria-label={media.type === "video" ? "Open video" : "Open photo"}
      className="absolute inset-0 block overflow-hidden bg-bg-soft"
    >
      {blurUrl && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity", loaded && "opacity-0")}
        />
      )}
      <img
        src={media.thumbUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
      {media.type === "video" && (
        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-ink">
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" fill="currentColor">
            <path d="M0 0 8 4 0 8Z" />
          </svg>
        </span>
      )}
    </button>
  );
}
