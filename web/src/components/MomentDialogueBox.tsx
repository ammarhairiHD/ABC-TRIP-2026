import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
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
  /** Whether the sheet is currently at its expanded (~90%) resting height,
   * vs. its default (~60-65%) one -- ClimbWalk owns the actual height (it
   * has to, since the map above needs to shrink to make room); this is
   * just for the handle's arrow glyph. */
  expanded: boolean;
  onToggleExpand: () => void;
  onHandlePointerDown: (e: PointerEvent) => void;
  onHandlePointerMove: (e: PointerEvent) => void;
  onHandlePointerUp: (e: PointerEvent) => void;
}

/** The draggable bottom sheet docked under the /climb map. Always showing
 * the active moment (there's no open/closed state here -- the map is always
 * "at" some moment): a drag handle, a fixed header (kind + "Day n ·
 * altitude" + title), a scrolling middle (story, then a 2-col photo grid,
 * then "See N photos"), and a compact Prev/Next row pinned below the
 * scroll area. The handle's own drag math lives in ClimbWalk (it also
 * resizes the map above), this just forwards the pointer events to it. */
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
  expanded,
  onToggleExpand,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
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
      <div
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        className="relative flex min-h-8 flex-shrink-0 touch-none items-center justify-center py-2"
      >
        <span aria-hidden className="h-1 w-10 rounded-full bg-panel-border" />
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleExpand}
          aria-label={expanded ? "Collapse" : "Expand"}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center font-pixel text-xs text-ink-dim"
        >
          {expanded ? "⤡" : "⤢"}
        </button>
      </div>

      <div className="flex-shrink-0 px-4">
        <div className="flex items-start justify-between gap-3">
          <span className={cn("border px-1 py-0.5 font-pixel text-[9px] uppercase leading-none", MOMENT_KIND_STYLES[kind])}>
            {t(`moment.${kind}`)}
          </span>
          <div className="font-pixel text-[9px] text-ink-dim">
            {t("climb.day", { n: dayId })}
            {altitudeM != null && <span className="ml-2">{altitudeM.toLocaleString()} m</span>}
          </div>
        </div>

        {!loading && !error && title && (
          <h2 className="mb-2 mt-2 font-pixel text-sm leading-relaxed text-ink">{title}</h2>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={checkOverflow} className="h-full overflow-y-auto px-4 pb-6 pt-1">
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
              <PixelButton className="mt-3 w-full" onClick={() => navigate(`/moments/${momentId}`)}>
                {t("climb.seePhotos", { count: media.length })}
              </PixelButton>
            </>
          )}
        </div>
        {hasMoreBelow && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-panel from-40% to-transparent pb-1 pt-4 font-pixel text-[9px] text-ink-dim"
          >
            <span className="animate-photos-hint-bob inline-block">{t("climb.photosHint")}</span>
          </div>
        )}
      </div>

      <div className="flex min-h-11 flex-shrink-0 items-center justify-between gap-2 border-t-2 border-panel-border px-4 py-1">
        <PixelButton
          variant="ghost"
          className="min-h-11 px-4 py-1"
          disabled={!hasPrev}
          onClick={onPrev}
          aria-label="Previous moment"
        >
          ◀ {t("common.prev")}
        </PixelButton>
        <PixelButton
          variant="ghost"
          className="min-h-11 px-4 py-1"
          disabled={!hasNext}
          onClick={onNext}
          aria-label="Next moment"
        >
          {t("common.next")} ▶
        </PixelButton>
      </div>
    </div>
  );
}
