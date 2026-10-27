import { MediaThumb } from "./MediaThumb";
import { cn } from "../lib/utils";
import type { MediaLike } from "../lib/mediaSlides";

/** Thumbnail grid shared by the day page, the person page and the /climb
 * dialogue box. Each tile's content-visibility is what keeps a few hundred
 * item grids scrolling smoothly -- see MediaThumb for why it lives on this
 * wrapper, not the thumb. */
export function MediaGrid({
  media,
  onOpen,
  columns = 3,
}: {
  media: readonly MediaLike[];
  onOpen: (index: number) => void;
  columns?: 2 | 3;
}) {
  return (
    <div className={cn("grid gap-[3px] px-[3px]", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {media.map((item, index) => (
        <div key={item.id} className="relative aspect-square [content-visibility:auto]">
          <MediaThumb media={item} onOpen={() => onOpen(index)} />
        </div>
      ))}
    </div>
  );
}
