import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { useDay } from "../hooks/useDay";
import { useDayMedia } from "../hooks/useDayMedia";
import { useDayContent } from "../hooks/useDayContent";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Sprite } from "../components/Sprite";
import { MediaThumb } from "../components/MediaThumb";
import { cn } from "../lib/utils";

function initials(nickname: string): string {
  return nickname
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DayPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { n } = useParams();
  const dayNumber = Number(n);
  const reducedMotion = useReducedMotion();

  const { data: dayData, isLoading: dayLoading } = useDay(dayNumber);
  const { data: mediaData, isLoading: mediaLoading } = useDayMedia(dayNumber);
  const content = useDayContent(dayNumber);

  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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

  const slides = useMemo(
    () =>
      media.map((item) =>
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
      ),
    [media]
  );

  if (dayLoading || mediaLoading || !dayData || !mediaData) {
    return <div className="flex min-h-screen items-center justify-center text-ink-dim">{t("common.loading")}</div>;
  }

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
        <span className="min-w-11" aria-hidden />
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

      <div className="mt-2 grid grid-cols-3 gap-[3px] px-[3px]">
        {media.map((item, index) => (
          <div key={item.id} className="relative aspect-square [content-visibility:auto]">
            <MediaThumb media={item} onOpen={() => setViewerIndex(index)} />
          </div>
        ))}
      </div>

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
