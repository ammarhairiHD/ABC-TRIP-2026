import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { usePerson } from "../hooks/usePerson";
import { usePeopleContent } from "../hooks/usePeopleContent";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Sprite } from "../components/Sprite";
import { MediaGrid } from "../components/MediaGrid";
import { buildLightboxSlides } from "../lib/mediaSlides";
import type { PersonMediaItem } from "../types/people";

function StatCard({ value, label, onClick }: { value: string; label: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="font-pixel text-sm text-ink">{value}</span>
      <span className="text-[11px] text-ink-dim">{label}</span>
    </>
  );
  const className = "flex flex-1 flex-col items-center gap-1 border-2 border-panel-border bg-panel p-3";
  return onClick ? (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const personId = id ?? null;
  const reducedMotion = useReducedMotion();

  const { data, isLoading } = usePerson(personId);
  const content = usePeopleContent();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [personId]);

  const media = data?.media ?? [];
  const slides = useMemo(() => buildLightboxSlides(media), [media]);

  // media is already sorted by (day_id, seq) from /api/people/:id, so a single
  // pass groups it into day sections while keeping a flat index for the
  // shared lightbox across every day's photos.
  const dayGroups = useMemo(() => {
    const groups: { dayId: number; items: PersonMediaItem[]; startIndex: number }[] = [];
    media.forEach((item, index) => {
      const last = groups[groups.length - 1];
      if (last && last.dayId === item.dayId) {
        last.items.push(item);
      } else {
        groups.push({ dayId: item.dayId, items: [item], startIndex: index });
      }
    });
    return groups;
  }, [media]);

  if (isLoading || !data || !personId) {
    return <div className="flex min-h-screen items-center justify-center text-ink-dim">{t("common.loading")}</div>;
  }

  const { person } = data;
  const trait = content.data?.person[personId]?.trait;
  const trailBuddy = person.mostWith[0];

  return (
    <div className="min-h-screen bg-bg pb-10">
      <header className="flex items-center justify-between px-2 py-2">
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          className="flex min-h-11 min-w-11 items-center justify-center font-pixel text-lg text-ink"
        >
          ←
        </button>
        <span className="min-w-11" aria-hidden />
      </header>

      <div className="flex flex-col items-center gap-3 px-6 pb-2 text-center">
        <Sprite fileName={`${personId}.png`} frameCount={2} initials={person.nickname.slice(0, 2).toUpperCase()} loop="idle" animate={!reducedMotion} scale={5} />
        <h1 className="font-pixel text-base leading-relaxed text-ink">{t("person.journey", { name: person.nickname })}</h1>
      </div>

      {trait && (
        <div className="mx-3 border-2 border-panel-border bg-panel p-5">
          <p className="text-sm leading-relaxed text-ink-dim">{trait}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2 px-3">
        <StatCard value={String(person.mediaCount)} label={t("person.photos")} />
        <StatCard value={String(person.daysPresent.length)} label={t("person.daysOnTrail")} />
        {trailBuddy && (
          <StatCard
            value={trailBuddy.nickname}
            label={t("person.trailBuddy")}
            onClick={() => navigate(`/people/${trailBuddy.id}`)}
          />
        )}
      </div>

      {dayGroups.map((group) => (
        <div key={group.dayId} className="mt-4">
          <h2 className="px-3 pb-2 font-pixel text-[11px] text-accent-strong">{t("climb.day", { n: group.dayId })}</h2>
          <MediaGrid media={group.items} onOpen={(localIndex) => setViewerIndex(group.startIndex + localIndex)} />
        </div>
      ))}

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
