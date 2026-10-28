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
import { cn } from "../lib/utils";
import { instagramHandle, instagramUrl } from "../lib/instagram";
import { ORGANISED_BY, SPECIAL_AWARDS, SCENERY_CREDIT, MUSIC_CREDIT, STORY_CODE_SPRITES, PIXEL_ART_HELPER, CODING_SIDEKICK } from "../data/credits";
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

/** /credits: a slow, game-style end-crawl that hands off to a normal,
 * freely-scrollable page the moment the reader wants control -- Skip, or
 * any wheel/touch on it. `mode` tracks which: "crawl" drives translateY by
 * hand (requestAnimationFrame) inside an overflow-hidden viewport; "free"
 * drops the transform and makes that same viewport overflow-y-auto, with
 * its scrollTop seeded from wherever the crawl had gotten to so the
 * handoff is seamless. A small Play button in "free" mode resumes the
 * crawl from the reader's current scroll position. Reduced motion skips
 * "crawl" entirely and starts straight in a normal scrollable page. */
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
  const [mode, setMode] = useState<"crawl" | "free">("crawl");
  const offsetRef = useRef(0);
  const maxOffsetRef = useRef(0);
  // Where "free" mode's native scrollTop should start from -- set right
  // before switching modes, applied by the useLayoutEffect below.
  const pendingScrollRef = useRef(0);

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

  // Seeds "free" mode's real scroll position right after the viewport
  // switches to overflow-y-auto, before the browser paints -- so handing
  // off never produces a visible jump.
  useLayoutEffect(() => {
    if (reducedMotion || mode !== "free") return;
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = pendingScrollRef.current;
  }, [reducedMotion, mode]);

  useEffect(() => {
    if (reducedMotion || mode !== "crawl") return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last == null) last = now;
      const dt = (now - last) / 1000;
      last = now;
      if (offsetRef.current < maxOffsetRef.current) {
        offsetRef.current = Math.min(maxOffsetRef.current, offsetRef.current + SCROLL_SPEED_PX_PER_S * dt);
        setOffset(offsetRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, mode]);

  // Any wheel or touch on the crawl hands control straight to the reader --
  // only listened for while actually crawling, and only this way (not a
  // React onWheel/onTouchStart on the div) so the Skip/Play buttons can
  // opt out with a plain stopPropagation rather than fighting a double
  // mode-change (see their onTouchStart below).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || reducedMotion || mode !== "crawl") return;
    const handoff = () => {
      pendingScrollRef.current = offsetRef.current;
      setMode("free");
    };
    viewport.addEventListener("wheel", handoff, { passive: true });
    viewport.addEventListener("touchstart", handoff, { passive: true });
    return () => {
      viewport.removeEventListener("wheel", handoff);
      viewport.removeEventListener("touchstart", handoff);
    };
    // `isLoading` is otherwise unused here -- it's there so this re-runs
    // once the real (non-loading-screen) tree mounts and viewportRef stops
    // being null. Without it, this effect's first run (during the loading
    // screen, before `viewportRef` has anything to attach to) would be the
    // only one, since reducedMotion/mode don't themselves change at that
    // point -- see the ResizeObserver effect above, saved from the same bug
    // only because trekkers.length/porters.length happen to change too.
  }, [reducedMotion, mode, isLoading]);

  function skip() {
    offsetRef.current = maxOffsetRef.current;
    pendingScrollRef.current = maxOffsetRef.current;
    setMode("free");
  }

  function resumeCrawl() {
    const viewport = viewportRef.current;
    offsetRef.current = viewport ? viewport.scrollTop : offsetRef.current;
    setOffset(offsetRef.current);
    setMode("crawl");
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
          <SectionHeading>{t("credits.music")}</SectionHeading>
          <p className="mt-1 text-sm text-ink-dim">
            <a
              href={MUSIC_CREDIT.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-accent-strong underline underline-offset-4"
            >
              "{MUSIC_CREDIT.title}"
            </a>{" "}
            by {MUSIC_CREDIT.artist}, via {MUSIC_CREDIT.source}
          </p>
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
      className={cn("relative bg-bg", mode === "crawl" ? "overflow-hidden" : "overflow-y-auto")}
      style={{ height: "calc(100dvh - var(--topbar-h))" }}
    >
      <div style={mode === "crawl" ? { transform: `translateY(${-offset}px)` } : undefined}>{body}</div>

      {mode === "crawl" ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            skip();
          }}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute right-3 top-3 min-h-11 border-2 border-panel-border bg-panel/90 px-3 font-pixel text-[10px] text-ink-dim"
        >
          {t("credits.skip")}
        </button>
      ) : (
        // fixed, not absolute: "free" mode's viewport is now the thing that
        // natively scrolls, so an absolute button would scroll away with
        // the content the moment the reader scrolls past the top -- fixed
        // keeps it reachable the whole way down.
        <button
          onClick={(e) => {
            e.stopPropagation();
            resumeCrawl();
          }}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed right-3 top-[calc(var(--topbar-h)+12px)] min-h-11 border-2 border-panel-border bg-panel/90 px-3 font-pixel text-[10px] text-ink-dim"
        >
          {t("credits.play")}
        </button>
      )}
    </div>
  );
}
