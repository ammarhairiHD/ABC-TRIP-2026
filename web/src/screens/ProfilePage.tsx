import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import Lightbox from "yet-another-react-lightbox";
import { DownloadButton } from "../components/DownloadButton";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { usePerson } from "../hooks/usePerson";
import { usePeopleContent } from "../hooks/usePeopleContent";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { Sprite } from "../components/Sprite";
import { BadgeIcon } from "../components/BadgeIcon";
import { MediaGrid } from "../components/MediaGrid";
import { LoadingScreen } from "../components/LoadingScreen";
import { cn } from "../lib/utils";
import { buildLightboxSlides } from "../lib/mediaSlides";
import { instagramUrl } from "../lib/instagram";
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

function BadgeDialog({
  open,
  onClose,
  name,
  description,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  description: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-bg/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={name}
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
              <h2 className="font-pixel text-sm leading-relaxed text-ink">{name}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="min-h-11 min-w-11 font-pixel text-ink-dim hover:text-ink"
              >
                X
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{description}</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
  const [activeBadge, setActiveBadge] = useState<string | null>(null);

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

  const pageLoading = isLoading || !data || !personId;
  const showLoader = useDelayedVisible(pageLoading);
  if (pageLoading) {
    return showLoader ? <LoadingScreen /> : null;
  }

  const { person } = data;
  const trait = content.data?.person[personId]?.trait;
  const badges = content.data?.person[personId]?.badges ?? [];
  const instagram = content.data?.person[personId]?.links?.instagram;
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

        {badges.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {badges.map((badgeId) => {
              const name = t(`badge.${badgeId}.name`);
              return (
                <button
                  key={badgeId}
                  onClick={() => setActiveBadge(badgeId)}
                  className="flex min-h-11 flex-col items-center gap-1 px-1"
                >
                  <BadgeIcon badgeId={badgeId} label={name} />
                  <span className="text-[10px] text-ink-dim">{name}</span>
                </button>
              );
            })}
          </div>
        )}

        {instagram && (
          <a
            href={instagramUrl(instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center border-2 border-panel-border bg-transparent px-6 py-3 font-pixel text-xs uppercase tracking-wide text-ink shadow-[3px_3px_0_0_var(--color-panel-border)] transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            {t("scenery.instagram")}
          </a>
        )}
      </div>

      {trait && (
        <div className="mx-3 border-2 border-panel-border bg-panel p-5">
          <p className="text-sm leading-relaxed text-ink-dim">{trait}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2 px-3">
        <StatCard value={String(person.mediaCount)} label={t("person.photos")} />
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
        toolbar={{ buttons: [<DownloadButton key="download" />, "close"] }}
      />

      <BadgeDialog
        open={activeBadge !== null}
        onClose={() => setActiveBadge(null)}
        name={activeBadge ? t(`badge.${activeBadge}.name`) : ""}
        description={activeBadge ? t(`badge.${activeBadge}.description`) : ""}
      />
    </div>
  );
}
