import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import { DownloadButton } from "../components/DownloadButton";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { useMoment } from "../hooks/useMoment";
import { useMomentsContent } from "../hooks/useMomentsContent";
import { useJourney } from "../hooks/useJourney";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Sprite } from "../components/Sprite";
import { MediaGrid } from "../components/MediaGrid";
import { PixelButton } from "../components/PixelButton";
import { InlineLoader } from "../components/InlineLoader";
import { LoadingScreen } from "../components/LoadingScreen";
import { buildLightboxSlides } from "../lib/mediaSlides";
import { initials } from "../lib/initials";
import { flattenMoments } from "../lib/moments";

const MAX_GRID_ITEMS = 4;

/** Steps to the previous/next moment in the /climb walk's order (all 37,
 * chronological). Off either end, there's nothing to step to but the walk
 * itself -- moment 1's "previous" and moment 37's "next" both go to /climb,
 * the latter relabelled since there's no further moment to name. */
function MomentNav({ prevId, nextId }: { prevId: string | null; nextId: string | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <PixelButton variant="ghost" onClick={() => navigate(prevId ? `/moments/${prevId}` : "/climb")}>
        ◀ {t("moment.previous")}
      </PixelButton>
      <PixelButton variant="ghost" onClick={() => navigate(nextId ? `/moments/${nextId}` : "/climb")}>
        {nextId ? t("moment.next") : t("moment.backToClimb")} ▶
      </PixelButton>
    </div>
  );
}

export function MomentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const momentId = id ?? null;

  const { data, isLoading } = useMoment(momentId);
  const content = useMomentsContent();
  const { data: journeyData } = useJourney();
  const reducedMotion = useReducedMotion();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [momentId]);

  const media = useMemo(() => data?.media.slice(0, MAX_GRID_ITEMS) ?? [], [data]);
  const slides = useMemo(() => buildLightboxSlides(media), [media]);

  // Same flattened order the /climb path itself walks, so prev/next here
  // matches scrolling through moment nodes there.
  const momentOrder = useMemo(() => (journeyData ? flattenMoments(journeyData.days) : []), [journeyData]);
  const currentIndex = momentOrder.findIndex((m) => m.id === momentId);
  const prevId = currentIndex > 0 ? momentOrder[currentIndex - 1]!.id : null;
  const nextId =
    currentIndex >= 0 && currentIndex < momentOrder.length - 1 ? momentOrder[currentIndex + 1]!.id : null;

  const pageLoading = isLoading || !data || !momentId;
  const showLoader = useDelayedVisible(pageLoading);
  if (pageLoading) {
    return showLoader ? <LoadingScreen /> : null;
  }

  const { moment, people } = data;
  const text = content.data?.moment[moment.id];

  return (
    <div className="min-h-screen bg-bg pb-10">
      <header className="flex items-center justify-between px-2 py-2">
        <button
          onClick={() => navigate(`/gallery/${moment.dayId}`)}
          aria-label={t("common.back")}
          className="flex min-h-11 min-w-11 items-center justify-center font-pixel text-lg text-ink"
        >
          ←
        </button>
        <div className="font-pixel text-[11px] text-accent-strong">{t(`moment.${moment.kind}`)}</div>
        <span className="min-w-11" aria-hidden />
      </header>

      <MomentNav prevId={prevId} nextId={nextId} />

      <div className="mx-3 border-2 border-panel-border bg-panel p-5">
        {content.isLoading && <InlineLoader />}
        {content.isError && (
          <p className="text-sm text-clay">Couldn't load this moment's story right now.</p>
        )}
        {!content.isLoading && !content.isError && (
          <>
            <h1 className="font-pixel text-sm leading-relaxed text-ink">{text?.title}</h1>
            {text?.story && <p className="mt-2 text-sm leading-relaxed text-ink-dim">{text.story}</p>}
          </>
        )}
      </div>

      <div className="mt-4">
        <MediaGrid media={media} onOpen={setViewerIndex} />
      </div>

      {people.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 px-3">
          <h2 className="font-pixel text-[11px] text-accent-strong">{t("moment.inThisMoment")}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2" aria-label={t("moment.inThisMoment")}>
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

      <MomentNav prevId={prevId} nextId={nextId} />

      <Lightbox
        open={viewerIndex !== null}
        close={() => setViewerIndex(null)}
        index={viewerIndex ?? 0}
        slides={slides}
        plugins={[Video]}
        toolbar={{ buttons: [<DownloadButton key="download" />, "close"] }}
      />
    </div>
  );
}
