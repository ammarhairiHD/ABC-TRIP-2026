import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useJourney } from "../hooks/useJourney";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { PixelButton } from "../components/PixelButton";
import { LoadingScreen } from "../components/LoadingScreen";
import { cn } from "../lib/utils";
import { landmarkForDay } from "../config/dayLandmarks";
import type { DayContent, JourneyDay } from "../types/journey";

async function fetchDayContent(dayNumber: number): Promise<DayContent | null> {
  const res = await fetch(`/i18n/en/day-${dayNumber}.json`);
  if (!res.ok) throw new Error(`day-${dayNumber}.json ${res.status}`);
  const body = (await res.json()) as { day: Record<string, DayContent> };
  return body.day[String(dayNumber)] ?? null;
}

/** /story: a plain scroll of all 11 day boxes, no walking map, no scroll
 * animation. The day-by-day walk this replaced lives on in spirit at
 * /climb, which still walks the trail -- this is just a flat read of every
 * day's story with a link into its gallery. */
export function StoryList() {
  const { data, isLoading } = useJourney();
  const days = data?.days ?? [];
  const pageLoading = isLoading || !data;
  const showLoader = useDelayedVisible(pageLoading);

  const contentQueries = useQueries({
    queries: days.map((day) => ({
      queryKey: ["day-content", day.id],
      queryFn: () => fetchDayContent(day.id),
      staleTime: Infinity,
    })),
  });

  if (pageLoading) {
    return showLoader ? <LoadingScreen /> : null;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 bg-bg px-3 py-4 pb-10">
      {days.map((day, i) => (
        <DayBox key={day.id} day={day} content={contentQueries[i]?.data} loading={contentQueries[i]?.isLoading} />
      ))}
    </div>
  );
}

function DayBox({
  day,
  content,
  loading,
}: {
  day: JourneyDay;
  content: DayContent | null | undefined;
  loading: boolean | undefined;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const landmark = landmarkForDay(day.id);
  const [landmarkFailed, setLandmarkFailed] = useState(false);
  const halfColor = day.half === "climb" ? "border-accent text-accent-strong" : "border-clay text-clay";

  return (
    <div className="border-2 border-panel-border bg-panel p-4">
      <div className="flex items-center gap-3">
        {landmark && !landmarkFailed ? (
          <img
            src={`/sprites/${landmark}.png`}
            alt=""
            aria-hidden
            draggable={false}
            className="h-10 w-10 flex-shrink-0 pixelated"
            style={{ imageRendering: "pixelated" }}
            onError={() => setLandmarkFailed(true)}
          />
        ) : (
          <div
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 font-pixel text-[10px]",
              halfColor
            )}
            aria-hidden
          >
            {day.id}
          </div>
        )}
        <div className="font-pixel text-[11px] text-accent-strong">
          {t("climb.day", { n: day.id })}
          {day.altitudeM != null && <span className="ml-2 text-ink-dim">{day.altitudeM.toLocaleString()} m</span>}
        </div>
      </div>

      <div className="mt-3 min-h-10">
        {loading && <p className="text-sm text-ink-dim">{t("common.loading")}</p>}
        {!loading && content && (
          <>
            <h2 className="font-pixel text-sm leading-relaxed text-ink">{content.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{content.story}</p>
          </>
        )}
      </div>

      <PixelButton className="mt-4 w-full" onClick={() => navigate(`/gallery/${day.id}`)}>
        {t("climb.seePhotos", { count: day.mediaCount })}
      </PixelButton>
    </div>
  );
}
