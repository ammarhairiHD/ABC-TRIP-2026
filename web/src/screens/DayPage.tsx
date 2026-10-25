import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { useDay } from "../hooks/useDay";
import { useDayMedia } from "../hooks/useDayMedia";
import { useDayContent } from "../hooks/useDayContent";
import { useJourney } from "../hooks/useJourney";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Sprite } from "../components/Sprite";
import { PixelButton } from "../components/PixelButton";
import { MediaGrid } from "../components/MediaGrid";
import { buildLightboxSlides } from "../lib/mediaSlides";
import { initials } from "../lib/initials";
import { cn } from "../lib/utils";

/** Prev/next day buttons, shown above and below the grid. Day 1's prev and the
 * last day's next both lead back to the map, since there's nothing beyond
 * either end yet (credits come later). */
function ChapterNav({ dayNumber, totalDays }: { dayNumber: number; totalDays: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const prevDay = dayNumber - 1;
  const nextDay = dayNumber + 1;
  const hasPrevDay = prevDay >= 1;
  const hasNextDay = nextDay <= totalDays;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <PixelButton variant="ghost" onClick={() => navigate(hasPrevDay ? `/day/${prevDay}` : "/climb")}>
        ◀ {hasPrevDay ? t("climb.day", { n: prevDay }) : t("common.backToMap")}
      </PixelButton>
      <PixelButton variant="ghost" onClick={() => navigate(hasNextDay ? `/day/${nextDay}` : "/climb")}>
        {hasNextDay ? t("climb.day", { n: nextDay }) : t("common.backToMap")} ▶
      </PixelButton>
    </div>
  );
}

export function DayPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { n } = useParams();
  const dayNumber = Number(n);
  const reducedMotion = useReducedMotion();

  const { data: dayData, isLoading: dayLoading } = useDay(dayNumber);
  const { data: mediaData, isLoading: mediaLoading } = useDayMedia(dayNumber);
  const { data: journeyData, isLoading: journeyLoading } = useJourney();
  const content = useDayContent(dayNumber);

  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [dayNumber]);

  const allMedia = mediaData?.media ?? [];
  // Faces are already embedded on each media item from /api/days/:n/media,
  // so filtering by teammate here needs no extra request.
  const media = useMemo(
    () =>
      selectedPerson
        ? allMedia.filter((item) => item.faces.some((face) => face.personId === selectedPerson))
        : allMedia,
    [allMedia, selectedPerson]
  );

  // Ammar is shown once, as "my sprite" in front; he's not a filterable teammate.
  const teammates = (dayData?.people ?? []).filter((person) => person.id !== "ammar");

  const slides = useMemo(() => buildLightboxSlides(media), [media]);

  if (dayLoading || mediaLoading || journeyLoading || !dayData || !mediaData || !journeyData) {
    return <div className="flex min-h-screen items-center justify-center text-ink-dim">{t("common.loading")}</div>;
  }

  const totalDays = journeyData.totals.days;

  return (
    <div className="min-h-screen bg-bg pb-10">
      <header className="flex items-center justify-between px-2 py-2">
        <button
          onClick={() => navigate("/climb")}
          aria-label={t("common.back")}
          className="flex min-h-11 min-w-11 items-center justify-center font-pixel text-lg text-ink"
        >
          ←
        </button>
        <div className="font-pixel text-[11px] text-accent-strong">
          {t("climb.day", { n: dayNumber })}
          {dayData.day.altitudeM != null && (
            <span className="ml-2 text-ink-dim">{dayData.day.altitudeM.toLocaleString()} m</span>
          )}
        </div>
        <button
          onClick={() => navigate("/people")}
          className="flex min-h-11 items-center px-2 font-pixel text-[10px] text-ink-dim"
        >
          {t("nav.people")}
        </button>
      </header>

      <div className="mx-3 border-2 border-panel-border bg-panel p-5">
        {content.isLoading && <p className="text-sm text-ink-dim">{t("common.loading")}</p>}
        {content.isError && <p className="text-sm text-clay">Couldn't load this day's story right now.</p>}
        {!content.isLoading && !content.isError && (
          <>
            <h1 className="font-pixel text-sm leading-relaxed text-ink">{content.data?.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{content.data?.story}</p>
          </>
        )}
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto px-3 pb-2" aria-label="The party">
        <div className="flex flex-shrink-0 flex-col items-center gap-1">
          <Sprite fileName="ammar.png" frameCount={2} initials="A" loop="idle" animate={!reducedMotion} />
          <span className="text-[11px] text-ink-dim">Ammar</span>
        </div>

        {teammates.map((person) => {
          const active = selectedPerson === person.id;
          return (
            <button
              key={person.id}
              onClick={() => setSelectedPerson(active ? null : person.id)}
              className={cn(
                "flex min-h-11 flex-shrink-0 flex-col items-center gap-1 rounded-sm p-1",
                active && "bg-panel"
              )}
            >
              <Sprite
                fileName={`${person.id}.png`}
                frameCount={2}
                initials={initials(person.nickname)}
                loop="idle"
                animate={!reducedMotion}
              />
              <span className={cn("text-[11px]", active ? "text-accent-strong" : "text-ink-dim")}>
                {person.nickname}
              </span>
            </button>
          );
        })}
      </div>

      <ChapterNav dayNumber={dayNumber} totalDays={totalDays} />

      <div className="mt-2">
        <MediaGrid media={media} onOpen={setViewerIndex} />
      </div>

      <ChapterNav dayNumber={dayNumber} totalDays={totalDays} />

      <Lightbox
        open={viewerIndex !== null}
        close={() => setViewerIndex(null)}
        index={viewerIndex ?? 0}
        slides={slides}
        plugins={[Video]}
      />
    </div>
  );
}
