import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePeople } from "../hooks/usePeople";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { Sprite } from "../components/Sprite";
import { PixelButton } from "../components/PixelButton";
import { LoadingScreen } from "../components/LoadingScreen";
import { initials } from "../lib/initials";
import { instagramHandle, instagramUrl } from "../lib/instagram";
import { ORGANISED_BY, SPECIAL_AWARDS, SCENERY_CREDIT, STORY_CODE_SPRITES, PIXEL_ART_HELPER, CODING_SIDEKICK } from "../data/credits";
import type { PersonListItem } from "../types/people";

// How fast the credits crawl upward, in pixels/second -- the one constant
// to tweak for pacing. Slow on purpose: these are meant to be read.
const SCROLL_SPEED_PX_PER_S = 26;

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-pixel text-[11px] uppercase tracking-wide text-accent-strong">{children}</h2>;
}

function PersonTile({ person }: { person: PersonListItem }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-1 p-2">
      <Sprite
        fileName={`${person.id}.png`}
        frameCount={2}
        initials={initials(person.nickname)}
        loop="idle"
        animate={!reducedMotion}
      />
      <span className="text-center text-[11px] text-ink-dim">{person.nickname}</span>
    </div>
  );
}

/** /credits: a slow, game-style end-crawl. Scrolling is done by hand (a
 * translateY driven by requestAnimationFrame) rather than native scroll, so
 * a tap anywhere can pause/resume it and Skip can jump straight to the end
 * -- both awkward with a real scroll container mid-animation. Reduced
 * motion drops the crawl entirely for a normal, manually-scrollable page. */
export function CreditsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { data, isLoading } = usePeople();

  const { trekkers, porters } = useMemo(() => {
    const people = data?.people ?? [];
    const byNickname = (a: PersonListItem, b: PersonListItem) => a.nickname.localeCompare(b.nickname);
    return {
      // "agency" (Raj) is credited by name in Organised By above, not as a
      // trekker tile; porters get their own section.
      trekkers: people.filter((p) => p.role !== "porter" && p.role !== "agency").sort(byNickname),
      porters: people.filter((p) => p.role === "porter").sort(byNickname),
    };
  }, [data]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const maxOffsetRef = useRef(0);
  pausedRef.current = paused;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || reducedMotion) return;
    const update = () => {
      maxOffsetRef.current = Math.max(0, content.scrollHeight - viewport.clientHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(content);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [reducedMotion, trekkers.length, porters.length]);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last == null) last = now;
      const dt = (now - last) / 1000;
      last = now;
      if (!pausedRef.current && offsetRef.current < maxOffsetRef.current) {
        offsetRef.current = Math.min(maxOffsetRef.current, offsetRef.current + SCROLL_SPEED_PX_PER_S * dt);
        setOffset(offsetRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  function skip() {
    offsetRef.current = maxOffsetRef.current;
    setOffset(offsetRef.current);
  }

  const pageLoading = isLoading || !data;
  const showLoader = useDelayedVisible(pageLoading);
  if (pageLoading) return showLoader ? <LoadingScreen /> : null;

  const body = (
    <div ref={contentRef} className="flex flex-col items-center gap-10 px-6 py-16 text-center">
      <div>
        <h1 className="font-pixel text-base leading-relaxed text-ink">{t("credits.subtitle")}</h1>
        <p className="mt-2 text-sm text-ink-dim">{t("credits.title")}</p>
      </div>

      <div>
        <SectionHeading>{t("credits.organisedBy")}</SectionHeading>
        <div className="mt-2 flex flex-col gap-1">
          {ORGANISED_BY.map((o) => (
            <p key={o.name} className="text-sm text-ink-dim">
              {o.group} <span className="text-ink">({o.name})</span>
            </p>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading>{t("credits.trekkers")}</SectionHeading>
        <div className="mt-3 grid grid-cols-3">
          {trekkers.map((p) => (
            <PersonTile key={p.id} person={p} />
          ))}
        </div>
      </div>

      {porters.length > 0 && (
        <div>
          <SectionHeading>{t("credits.porters")}</SectionHeading>
          <p className="mt-1 text-sm text-ink-dim">{t("credits.portersNote")}</p>
          <div className="mt-3 grid grid-cols-3">
            {porters.map((p) => (
              <PersonTile key={p.id} person={p} />
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeading>{t("credits.specialAwards")}</SectionHeading>
        <div className="mt-2 flex flex-col gap-1.5">
          {SPECIAL_AWARDS.map((a) => (
            <p key={a.title} className="text-sm text-ink-dim">
              {a.title}: <span className="text-ink">{a.name}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <SectionHeading>{t("credits.scenery")}</SectionHeading>
          <a
            href={instagramUrl(SCENERY_CREDIT.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-block text-sm text-accent-strong underline underline-offset-4"
          >
            {SCENERY_CREDIT.name} ({instagramHandle(SCENERY_CREDIT.instagram)})
          </a>
        </div>
        <div>
          <SectionHeading>{t("credits.photos")}</SectionHeading>
          <p className="mt-1 text-sm text-ink-dim">{t("credits.photosCredit")}</p>
        </div>
        <div>
          <SectionHeading>{t("credits.storyCodeSprites")}</SectionHeading>
          <p className="mt-1 text-sm text-ink-dim">{STORY_CODE_SPRITES}</p>
        </div>
        <div>
          <SectionHeading>{t("credits.pixelArtHelper")}</SectionHeading>
          <p className="mt-1 text-sm text-ink-dim">{PIXEL_ART_HELPER}</p>
        </div>
        <div>
          <SectionHeading>{t("credits.codingSidekick")}</SectionHeading>
          <p className="mt-1 text-sm text-ink-dim">{CODING_SIDEKICK}</p>
        </div>
      </div>

      <div>
        <p className="font-pixel text-xs leading-relaxed text-ink">{t("credits.thankYou")}</p>
        <p className="mt-2 font-pixel text-xs leading-relaxed text-ink">{t("credits.mountainStays")}</p>
      </div>

      <div className="flex w-full flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <PixelButton onClick={() => navigate("/climb")}>{t("credits.walkAgain")}</PixelButton>
        <PixelButton variant="ghost" onClick={() => navigate("/story")}>
          {t("credits.seeAllPhotos")}
        </PixelButton>
      </div>
    </div>
  );

  if (reducedMotion) {
    return (
      <div className="overflow-y-auto bg-bg" style={{ height: "calc(100dvh - var(--topbar-h))" }}>
        {body}
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      onClick={() => setPaused((p) => !p)}
      className="relative overflow-hidden bg-bg"
      style={{ height: "calc(100dvh - var(--topbar-h))" }}
    >
      <div style={{ transform: `translateY(${-offset}px)` }}>{body}</div>

      {paused && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-3 flex justify-center font-pixel text-[10px] text-ink-dim"
        >
          {t("credits.paused")}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
        className="absolute right-3 top-3 min-h-11 border-2 border-panel-border bg-panel/90 px-3 font-pixel text-[10px] text-ink-dim"
      >
        {t("credits.skip")}
      </button>
    </div>
  );
}
