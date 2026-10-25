import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSaveData } from "../hooks/useSaveData";
import { cn } from "../lib/utils";
import { MOMENT_KIND_STYLES } from "../lib/momentKindStyles";
import type { DayMoment } from "../types/journey";

/**
 * One card in the day page's horizontally swipeable moment row. A video hero
 * shows its muted preview clip (see media-urls.ts buildPreviewClipUrl)
 * looping over the poster frame, unless the viewer prefers reduced motion or
 * has data-saver on -- then it's just the static poster, same as a photo hero.
 */
export function MomentCard({ moment, title }: { moment: DayMoment; title: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const saveData = useSaveData();
  const { hero } = moment;

  const canAutoplayClip =
    !reducedMotion && !saveData && hero?.type === "video" && hero.previewClipUrl != null;

  return (
    <button
      onClick={() => navigate(`/moments/${moment.id}`)}
      className="flex w-36 flex-shrink-0 flex-col overflow-hidden border-2 border-panel-border bg-panel text-left"
    >
      <div className="relative aspect-square bg-bg-soft">
        {hero &&
          (canAutoplayClip ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={hero.previewClipUrl!}
              poster={hero.posterUrl ?? undefined}
              muted
              loop
              playsInline
              autoPlay
              preload="none"
            />
          ) : (
            <img
              src={(hero.type === "video" ? hero.posterUrl : hero.thumbUrl) ?? hero.thumbUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ))}
        <span
          className={cn(
            "absolute left-1 top-1 border bg-bg/80 px-1 py-0.5 font-pixel text-[8px] uppercase leading-none",
            MOMENT_KIND_STYLES[moment.kind]
          )}
        >
          {t(`moment.${moment.kind}`)}
        </span>
      </div>
      <span className="line-clamp-2 p-2 font-pixel text-[10px] leading-relaxed text-ink">{title}</span>
    </button>
  );
}
