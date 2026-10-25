import { MediaThumb } from "./MediaThumb";
import type { MediaLike } from "../lib/mediaSlides";

/** 3-column thumbnail grid shared by the day page and the person page. Each
 * tile's content-visibility is what keeps a few hundred items scrolling
 * smoothly -- see MediaThumb for why it lives on this wrapper, not the thumb. */
export function MediaGrid({ media, onOpen }: { media: readonly MediaLike[]; onOpen: (index: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-[3px] px-[3px]">
      {media.map((item, index) => (
        <div key={item.id} className="relative aspect-square [content-visibility:auto]">
          <MediaThumb media={item} onOpen={() => onOpen(index)} />
        </div>
      ))}
    </div>
  );
}
