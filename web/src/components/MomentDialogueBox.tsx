import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSaveData } from "../hooks/useSaveData";
import { cn } from "../lib/utils";
import { initials } from "../lib/initials";
import { MOMENT_KIND_STYLES } from "../lib/momentKindStyles";
import { PixelButton } from "./PixelButton";
import { InlineLoader } from "./InlineLoader";
import { Sprite } from "./Sprite";
import type { MomentHero, MomentKind } from "../types/journey";

interface MomentDialoguePerson {
  id: string;
  nickname: string;
}

interface MomentDialogueBoxProps {
  open: boolean;
  onClose: () => void;
  momentId: string;
  kind: MomentKind;
  dayId: number;
  altitudeM: number | null;
  title?: string;
  story?: string;
  hero: MomentHero | null;
  people: MomentDialoguePerson[];
  photoCount: number;
  loading?: boolean;
  error?: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/** Retro game dialogue window for a moment node on /climb -- same shell as
 * DialogueBox (day story), but for a moment: hero media, who's in it, and a
 * link into the gallery instead of a day's intro text. The Prev/Next row at
 * the bottom only scrolls the page to the neighboring moment node -- it
 * never sets the active moment itself. The map's own scroll-progress
 * listener is what notices the new position and opens that moment's
 * dialogue, same as a manual scroll or the menu's jump links -- scroll
 * position stays the one source of truth for where the sprite (and this
 * dialogue) is. */
export function MomentDialogueBox({
  open,
  onClose,
  momentId,
  kind,
  dayId,
  altitudeM,
  title,
  story,
  hero,
  people,
  photoCount,
  loading,
  error,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: MomentDialogueBoxProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const saveData = useSaveData();

  const canAutoplayClip = !reducedMotion && !saveData && hero?.type === "video" && hero.previewClipUrl != null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t(`moment.${kind}`)}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md",
              "border-2 border-panel-border bg-panel p-5 pb-7",
              "shadow-[0_-4px_0_0_var(--color-bg)]"
            )}
            initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: reducedMotion ? 0.15 : 0.25, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  "border px-1 py-0.5 font-pixel text-[9px] uppercase leading-none",
                  MOMENT_KIND_STYLES[kind]
                )}
              >
                {t(`moment.${kind}`)}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="min-h-11 min-w-11 font-pixel text-ink-dim hover:text-ink"
              >
                X
              </button>
            </div>

            <div className="mt-3 max-h-[50vh] overflow-y-auto pr-1">
              {loading && <InlineLoader />}
              {error && (
                <p className="text-sm text-clay">Couldn't load this moment's story right now.</p>
              )}
              {!loading && !error && (
                <>
                  <div className="font-pixel text-[10px] text-ink-dim">
                    {t("climb.day", { n: dayId })}
                    {altitudeM != null && <span className="ml-2">{altitudeM.toLocaleString()} m</span>}
                  </div>
                  <h2 className="mt-1 font-pixel text-sm leading-relaxed text-ink">{title}</h2>
                  {story && <p className="mt-2 text-sm leading-relaxed text-ink-dim">{story}</p>}

                  {hero && (
                    <div className="relative mt-3 aspect-square overflow-hidden bg-bg-soft">
                      {canAutoplayClip ? (
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
                          draggable={false}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {people.length > 0 && (
                    <div className="mt-3">
                      <h3 className="font-pixel text-[10px] text-accent-strong">{t("moment.inThisMoment")}</h3>
                      <div className="mt-1 flex gap-3 overflow-x-auto pb-1" aria-label={t("moment.inThisMoment")}>
                        {people.map((person) => (
                          <button
                            key={person.id}
                            onClick={() => navigate(`/people/${person.id}`)}
                            className="flex min-h-11 flex-shrink-0 flex-col items-center gap-1 p-1"
                          >
                            <Sprite
                              fileName={`${person.id}.png`}
                              frameCount={2}
                              initials={initials(person.nickname)}
                              loop="idle"
                              animate={!reducedMotion}
                            />
                            <span className="text-[11px] text-ink-dim">{person.nickname}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!loading && !error && (
              <PixelButton className="mt-4 w-full" onClick={() => navigate(`/moments/${momentId}`)}>
                {t("climb.seePhotos", { count: photoCount })}
              </PixelButton>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <PixelButton variant="ghost" disabled={!hasPrev} onClick={onPrev} aria-label="Previous moment">
                ◀ {t("common.prev")}
              </PixelButton>
              <PixelButton variant="ghost" disabled={!hasNext} onClick={onNext} aria-label="Next moment">
                {t("common.next")} ▶
              </PixelButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
