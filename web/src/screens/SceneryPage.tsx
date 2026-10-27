import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { useScenery } from "../hooks/useScenery";
import { useSceneryCaptions } from "../hooks/useSceneryCaptions";
import { usePeopleContent } from "../hooks/usePeopleContent";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { Sprite } from "../components/Sprite";
import { LoadingScreen } from "../components/LoadingScreen";
import { useBlurhashDataUrl } from "../components/MediaThumb";
import { buildLightboxSlides } from "../lib/mediaSlides";
import { instagramHandle, instagramUrl } from "../lib/instagram";
import { cn } from "../lib/utils";
import type { SceneryMediaItem } from "../types/scenery";

// Matches index.css's --topbar-h: the one fixed chrome element (Layout's
// sticky TopBar) that stays above this full-screen exhibition. Each slide
// fills exactly the rest of the viewport, never more -- so the whole page
// never scrolls, only this slide track does.
const SLIDE_HEIGHT = "h-[calc(100dvh-var(--topbar-h))]";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** One full-height section of the slide track. Registers itself by `index`
 * so the IntersectionObserver in SceneryPage can tell which slide is
 * currently on screen (for the counter and the current+next lazy window). */
function Slide({
  index,
  setRef,
  className,
  children,
}: {
  index: number;
  setRef: (el: HTMLElement | null) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section ref={setRef} data-index={index} className={cn(SLIDE_HEIGHT, "snap-start shrink-0", className)}>
      {children}
    </section>
  );
}

function SceneryIntroSlide({ instagram }: { instagram: string | undefined }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <Sprite fileName="alya.png" frameCount={2} initials="A" loop="idle" animate={!reducedMotion} scale={6} />
      <div>
        <p className="font-pixel text-[10px] uppercase tracking-wide text-ink-dim">{t("scenery.eyebrow")}</p>
        <h1 className="mt-1 font-pixel text-base leading-relaxed text-ink">{t("nav.scenery")}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-dim">{t("scenery.intro")}</p>
      </div>
      {instagram && (
        <a
          href={instagramUrl(instagram)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("scenery.instagram")}
          className="font-pixel text-xs text-accent-strong underline underline-offset-4"
        >
          {instagramHandle(instagram)}
        </a>
      )}
    </div>
  );
}

/** One framed photo: object-fit: contain against a dark backdrop, a thin
 * 8-bit frame, a small "n / total" counter chip, and (only when one exists)
 * Alya's caption in a dialogue strip below. `eager` governs whether the real
 * image is mounted at all -- off-window slides show only their blurhash. */
function SceneryFrame({
  item,
  index,
  total,
  caption,
  eager,
  onOpen,
}: {
  item: SceneryMediaItem;
  index: number;
  total: number;
  caption: string | undefined;
  eager: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const blurUrl = useBlurhashDataUrl(item.blurhash);

  // Flexbox centering gives an auto-sized box no definite size to resolve
  // aspect-ratio against (its only children are position:absolute, so it has
  // no content to size from), so the frame is measured directly against its
  // wrapper instead -- the usual "object-fit: contain" box-fitting math,
  // applied to the frame itself so the thin border hugs the photo exactly
  // rather than stretching to fill the whole slide.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const scale = Math.min(el.clientWidth / item.width, el.clientHeight / item.height);
      if (scale > 0 && Number.isFinite(scale)) {
        setBox({ w: Math.floor(item.width * scale), h: Math.floor(item.height * scale) });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.width, item.height]);

  return (
    <div className="flex h-full flex-col bg-black">
      <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-center justify-center p-3">
        <button
          onClick={onOpen}
          aria-label={t("viewer.inThisPhoto")}
          style={box ? { width: box.w, height: box.h } : undefined}
          className="relative border-2 border-panel-border shadow-[3px_3px_0_0_var(--color-panel-border)]"
        >
          {blurUrl && (
            <img
              src={blurUrl}
              alt=""
              aria-hidden
              draggable={false}
              className={cn(
                "absolute inset-0 h-full w-full object-contain transition-opacity",
                loaded && "opacity-0"
              )}
            />
          )}
          {eager && (
            <img
              src={item.webUrl ?? item.thumbUrl}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(true)}
              className={cn(
                "absolute inset-0 h-full w-full object-contain transition-opacity duration-300",
                loaded ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </button>

        <span className="absolute right-3 top-3 border-2 border-panel-border bg-panel/90 px-2 py-1 font-pixel text-[10px] text-ink-dim">
          {t("scenery.counter", { current: pad2(index + 1), total: pad2(total) })}
        </span>
      </div>

      {caption && (
        <div className="mx-4 mb-4 shrink-0 border-2 border-panel-border bg-panel px-4 py-3 text-center text-sm leading-relaxed text-ink-dim shadow-[3px_3px_0_0_var(--color-panel-border)]">
          {caption}
        </div>
      )}
    </div>
  );
}

export function SceneryPage() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const { data, isLoading } = useScenery();
  const media = useMemo(() => data?.media ?? [], [data]);
  const dayIds = useMemo(() => media.map((item) => item.dayId), [media]);
  const captions = useSceneryCaptions(dayIds);
  const peopleContent = usePeopleContent();
  const alyaInstagram = peopleContent.data?.person["alya"]?.links?.instagram;

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const slides = useMemo(() => buildLightboxSlides(media), [media]);

  // Slide 0 is always the intro; slide 1 the "nothing yet" placeholder when
  // there's no media, otherwise one slide per photo/video.
  const slideCount = media.length === 0 ? 2 : media.length + 1;
  const [activeSlide, setActiveSlide] = useState(0);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (!best || entry.intersectionRatio > best.ratio) best = { index: idx, ratio: entry.intersectionRatio };
        }
        if (best) setActiveSlide(best.index);
      },
      { root: container, threshold: 0.5 }
    );
    for (const el of slideRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [slideCount]);

  // Mirrors activeSlide, but goTo updates it the instant it's called instead
  // of waiting for the IntersectionObserver to notice the scroll has landed
  // (which only happens once the smooth-scroll animation finishes). Without
  // this, two quick clicks/key presses both read the same stale activeSlide
  // and target the same next slide instead of advancing twice.
  const activeSlideRef = useRef(0);
  useEffect(() => {
    activeSlideRef.current = activeSlide;
  }, [activeSlide]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(slideCount - 1, index));
      activeSlideRef.current = clamped;
      slideRefs.current[clamped]?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [slideCount, reducedMotion]
  );

  const goToRelative = useCallback((delta: number) => goTo(activeSlideRef.current + delta), [goTo]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") goToRelative(1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") goToRelative(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToRelative]);

  const pageLoading = isLoading || !data;
  const showLoader = useDelayedVisible(pageLoading);
  if (pageLoading) {
    return showLoader ? <LoadingScreen /> : null;
  }

  // -1 while the intro slide is active, so neither window index matches any
  // real photo until the user scrolls past it -- see the `eager` prop below.
  const activeMediaIndex = activeSlide - 1;

  return (
    <div className="bg-bg">
      <div
        ref={containerRef}
        className="snap-y snap-mandatory overflow-y-scroll"
        style={{ height: "calc(100dvh - var(--topbar-h))" }}
      >
        <Slide index={0} setRef={(el) => (slideRefs.current[0] = el)}>
          <SceneryIntroSlide instagram={alyaInstagram} />
        </Slide>

        {media.length === 0 ? (
          <Slide index={1} setRef={(el) => (slideRefs.current[1] = el)}>
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-sm text-ink-dim">{t("scenery.empty")}</p>
            </div>
          </Slide>
        ) : (
          media.map((item, i) => (
            <Slide key={item.id} index={i + 1} setRef={(el) => (slideRefs.current[i + 1] = el)}>
              <SceneryFrame
                item={item}
                index={i}
                total={media.length}
                caption={captions.data?.[item.id]}
                eager={i === activeMediaIndex || i === activeMediaIndex + 1}
                onOpen={() => setViewerIndex(i)}
              />
            </Slide>
          ))
        )}
      </div>

      {media.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 hidden items-center justify-between px-2 sm:flex" style={{ top: "var(--topbar-h)" }}>
          <button
            onClick={() => goToRelative(-1)}
            disabled={activeSlide === 0}
            aria-label={t("common.prev")}
            className="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center border-2 border-panel-border bg-panel/80 font-pixel text-lg text-ink disabled:opacity-30"
          >
            ◀
          </button>
          <button
            onClick={() => goToRelative(1)}
            disabled={activeSlide === slideCount - 1}
            aria-label={t("common.next")}
            className="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center border-2 border-panel-border bg-panel/80 font-pixel text-lg text-ink disabled:opacity-30"
          >
            ▶
          </button>
        </div>
      )}

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
