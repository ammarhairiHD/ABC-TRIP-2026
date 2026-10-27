import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { MOMENT_KIND_STYLES } from "../lib/momentKindStyles";
import { PixelButton } from "./PixelButton";
import { InlineLoader } from "./InlineLoader";
import { MediaGrid } from "./MediaGrid";
import type { MomentKind } from "../types/journey";
import type { MomentMediaItem } from "../types/moments";

interface MomentDialogueBoxProps {
  momentId: string;
  kind: MomentKind;
  dayId: number;
  altitudeM: number | null;
  title?: string;
  story?: string;
  media: MomentMediaItem[];
  loading?: boolean;
  error?: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/** The ~40%-of-screen dialogue docked under the /climb map. Always showing
 * the active moment (there's no open/closed state here -- the map is always
 * "at" some moment), so this is a plain flex column, not the floating
 * bottom-sheet /story's day dialogue used to be: a fixed header (kind +
 * "Day n · altitude" + title), a scrolling middle (story, then a 2-col photo
 * grid), and Prev/Next pinned below the scroll area. */
export function MomentDialogueBox({
  momentId,
  kind,
  dayId,
  altitudeM,
  title,
  story,
  media,
  loading,
  error,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: MomentDialogueBoxProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  function checkOverflow() {
    const el = scrollRef.current;
    if (!el) return;
    setHasMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }

  // Re-check whenever the moment's content changes shape (loading settles,
  // story/media arrive) -- scrollHeight isn't known until that content paints.
  useLayoutEffect(checkOverflow, [loading, story, media.length]);

  return (
    <div className="flex h-full flex-col border-t-2 border-panel-border bg-panel">
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <span className={cn("border px-1 py-0.5 font-pixel text-[9px] uppercase leading-none", MOMENT_KIND_STYLES[kind])}>
          {t(`moment.${kind}`)}
        </span>
        <div className="font-pixel text-[9px] text-ink-dim">
          {t("climb.day", { n: dayId })}
          {altitudeM != null && <span className="ml-2">{altitudeM.toLocaleString()} m</span>}
        </div>
      </div>

      {!loading && !error && title && (
        <h2 className="px-4 pt-2 font-pixel text-sm leading-relaxed text-ink">{title}</h2>
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={checkOverflow} className="h-full overflow-y-auto px-4 pb-6 pt-2">
          {loading && <InlineLoader />}
          {error && <p className="text-sm text-clay">Couldn't load this moment's story right now.</p>}
          {!loading && !error && (
            <>
              {story && <p className="text-sm leading-relaxed text-ink-dim">{story}</p>}
              {media.length > 0 && (
                <div className="mt-3">
                  <MediaGrid media={media} columns={2} onOpen={() => navigate(`/moments/${momentId}`)} />
                </div>
              )}
            </>
          )}
        </div>
        {hasMoreBelow && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-panel from-40% to-transparent pb-1 pt-4 font-pixel text-[9px] text-ink-dim"
          >
            {t("climb.photosHint")}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t-2 border-panel-border px-4 py-3">
        {!loading && !error && (
          <PixelButton className="w-full" onClick={() => navigate(`/moments/${momentId}`)}>
            {t("climb.seePhotos", { count: media.length })}
          </PixelButton>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <PixelButton variant="ghost" disabled={!hasPrev} onClick={onPrev} aria-label="Previous moment">
            ◀ {t("common.prev")}
          </PixelButton>
          <PixelButton variant="ghost" disabled={!hasNext} onClick={onNext} aria-label="Next moment">
            {t("common.next")} ▶
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
