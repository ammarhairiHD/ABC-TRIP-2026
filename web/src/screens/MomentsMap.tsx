import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useJourney } from "../hooks/useJourney";
import { useMomentsContent } from "../hooks/useMomentsContent";
import { useMoment } from "../hooks/useMoment";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { useElementSize } from "../hooks/useElementSize";
import { Sprite } from "../components/Sprite";
import { MomentDialogueBox } from "../components/MomentDialogueBox";
import { LoadingScreen } from "../components/LoadingScreen";
import { cn } from "../lib/utils";
import { MOMENT_KIND_STYLES } from "../lib/momentKindStyles";
import { initials } from "../lib/initials";
import { flattenMoments, type FlatMoment } from "../lib/moments";
import { OVERLAP_RATIO, pathYForFraction, computePanelLayout, pointForMoment, allMomentPoints, type PanelLayout } from "../lib/mapLayout";

const MARKER_SIZE = 44; // the marker button's touch target (its visible diamond is much smaller) -- used to clear the people row above it
const WALK_DURATION_S = 0.6;
// Darkens the map art so sprites, the path and name labels read clearly
// against it. One constant, tweak freely -- 0 is off, 1 is solid black.
const MAP_OVERLAY_STRENGTH = 0.4;
const MAX_PEOPLE_SHOWN = 6;
// The dialogue sheet's height as a fraction of the whole screen (map +
// sheet): resting around 60-65% so the map keeps 35-40%, draggable up to
// ~90% for reading. Also used to pace the resize transition when settling.
const DEFAULT_SHEET_RATIO = 0.62;
const EXPANDED_SHEET_RATIO = 0.9;

interface MapMoment extends FlatMoment {
  x: number; // fraction, 0-1
  y: number; // fraction, 0-1
}

/** /climb: the horizontal, RPG-style walk across all 37 moments. The map
 * is one wide image (several panels, crossfaded at their seams) the camera
 * pans across as the player steps Next/Prev; the moment dialogue is
 * permanently docked under it, since
 * there's no "closed" state here -- the walk is always standing at some
 * moment. See /climb?place=1 (PlacementEditor below) for the tool that
 * produces moment-points.json. */
export function MomentsMap() {
  const [searchParams] = useSearchParams();
  const placing = searchParams.get("place") === "1";
  const { data, isLoading } = useJourney();
  const pageLoading = isLoading || !data;
  const showLoader = useDelayedVisible(pageLoading);

  const moments: MapMoment[] = useMemo(() => {
    if (!data) return [];
    const flat = flattenMoments(data.days);
    return flat.map((m, i) => ({ ...m, ...pointForMoment(m.id, i, flat.length) }));
  }, [data]);

  if (pageLoading) return showLoader ? <LoadingScreen /> : null;
  if (placing) return <PlacementEditor moments={moments} />;
  return <ClimbWalk moments={moments} />;
}

/** The map panels, laid side by side per `panels` (from computePanelLayout)
 * -- shared by the normal walk and the placement editor so both agree on
 * where a given (x, y) fraction actually lands. Each panel after the first
 * overlaps the previous one and fades in across that overlap (a left-edge
 * mask gradient), which is what hides the seam: the panel underneath stays
 * fully opaque, so the fading panel on top blends smoothly into it instead
 * of cutting hard from one image to the next. `loading="lazy"` means a
 * panel's bytes aren't fetched until it's actually near the viewport --
 * panned-to panels download as the camera reaches them, not all at once. */
function MapPanels({ panels, heightPx }: { panels: PanelLayout[]; heightPx: number }) {
  const overlapPx = heightPx * OVERLAP_RATIO;
  return (
    <>
      {panels.map((p, i) => (
        <img
          key={p.file}
          src={`/map/${p.file}`}
          alt=""
          aria-hidden
          draggable={false}
          loading="lazy"
          decoding="async"
          className="pixelated absolute left-0 top-0"
          style={{
            left: p.left,
            width: p.width,
            height: heightPx,
            imageRendering: "pixelated",
            maskImage: i > 0 ? `linear-gradient(to right, transparent, black ${overlapPx}px)` : undefined,
            WebkitMaskImage: i > 0 ? `linear-gradient(to right, transparent, black ${overlapPx}px)` : undefined,
          }}
        />
      ))}
    </>
  );
}

function TrailSvg({ moments, worldWidth, worldHeight }: { moments: MapMoment[]; worldWidth: number; worldHeight: number }) {
  const points = moments.map((m) => `${m.x * worldWidth},${m.y * worldHeight}`).join(" ");
  return (
    <svg className="absolute inset-0" width={worldWidth} height={worldHeight} aria-hidden>
      <polyline points={points} fill="none" stroke="var(--color-path)" strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
    </svg>
  );
}

/** A moment's spot on the trail: a small pixel diamond, kind-colored --
 * the map art itself shows the place, so this doesn't need to (it used to
 * carry a landmark icon; the two together was too busy and hard to read
 * against the art). The button's own hit area stays a full 44px touch
 * target even though the visible marker is much smaller. */
function MomentMarker({
  moment,
  worldWidth,
  worldHeight,
  active,
  onSelect,
}: {
  moment: MapMoment;
  worldWidth: number;
  worldHeight: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const left = moment.x * worldWidth;
  const top = moment.y * worldHeight;

  return (
    <button
      id={`moment-node-${moment.id}`}
      onClick={onSelect}
      aria-label={t(`moment.${moment.kind}`)}
      className="absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={{ left, top }}
    >
      <span
        className={cn(
          "block h-3 w-3 rotate-45 border-2 bg-bg-soft",
          MOMENT_KIND_STYLES[moment.kind],
          active && "bg-panel ring-2 ring-accent-strong"
        )}
      />
    </button>
  );
}

/** The people in the active moment, standing near its marker with their
 * nickname above their head. Capped at 6 + a "+N" bubble; never includes
 * hidden people or Simran -- /api/moments/:id already leaves them out. */
function PeopleAtPoint({
  people,
  anchorX,
  anchorY,
}: {
  people: { id: string; nickname: string }[];
  anchorX: number;
  anchorY: number;
}) {
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const shown = people.slice(0, MAX_PEOPLE_SHOWN);
  const overflow = people.length - shown.length;
  const slots = overflow > 0 ? [...shown, null] : shown;
  // Full nicknames, not truncated -- so same-row neighbours need more room
  // than one slot-width apart. Staggering into two rows (even slots low,
  // odd slots high) doubles the horizontal gap between any two names that
  // actually share a row, which is what keeps them from colliding or
  // running off each other at 6-7 people wide.
  const spacing = 40;
  const rowGap = 30;
  const startX = anchorX - ((slots.length - 1) * spacing) / 2;
  const lowY = anchorY - MARKER_SIZE / 2 - 30;
  const highY = lowY - rowGap;

  return (
    <>
      {slots.map((person, i) => {
        const x = startX + i * spacing;
        const y = i % 2 === 0 ? lowY : highY;
        if (!person) {
          return (
            <div
              key="more"
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ left: x, top: y }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-panel-border bg-bg-soft font-pixel text-[8px] text-ink-dim">
                +{overflow}
              </div>
            </div>
          );
        }
        return (
          <button
            key={person.id}
            onClick={() => navigate(`/people/${person.id}`)}
            aria-label={person.nickname}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: x, top: y }}
          >
            <span className="whitespace-nowrap font-pixel text-[6px] leading-none text-ink">{person.nickname}</span>
            <Sprite
              fileName={`${person.id}.png`}
              frameCount={2}
              initials={initials(person.nickname)}
              scale={1}
              loop="idle"
              animate={!reducedMotion}
            />
          </button>
        );
      })}
    </>
  );
}

/** The real /climb screen: map area (~35-40% of the viewport below the top
 * bar) with the camera panning to keep the sprite in view, and the moment
 * dialogue docked below it as a draggable bottom sheet (~60-65% at rest,
 * ~90% expanded). */
function ClimbWalk({ moments }: { moments: MapMoment[] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { ref: screenRef, size: screenSize } = useElementSize<HTMLDivElement>();
  const { ref: viewportRef, size: viewportSize } = useElementSize<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);
  const skipAnimRef = useRef(false);
  const mountedRef = useRef(false);

  // The sheet's resting height, as a fraction of the whole screen (map +
  // sheet) -- only ever DEFAULT_SHEET_RATIO or EXPANDED_SHEET_RATIO once a
  // drag/tap settles. dragRatio is the live value while an actual drag is
  // in progress (null the rest of the time); effectiveRatio is whichever
  // of the two currently applies, and is what actually sizes the two panes.
  const [sheetRatio, setSheetRatio] = useState(DEFAULT_SHEET_RATIO);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragStartRef = useRef<{ y: number; ratio: number } | null>(null);
  const effectiveRatio = dragRatio ?? sheetRatio;
  const dragging = dragRatio !== null;

  function handleHandlePointerDown(e: PointerEvent) {
    dragStartRef.current = { y: e.clientY, ratio: effectiveRatio };
    setDragRatio(effectiveRatio);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleHandlePointerMove(e: PointerEvent) {
    const start = dragStartRef.current;
    if (!start || screenSize.height === 0) return;
    const deltaRatio = -(e.clientY - start.y) / screenSize.height;
    setDragRatio(Math.min(EXPANDED_SHEET_RATIO, Math.max(DEFAULT_SHEET_RATIO, start.ratio + deltaRatio)));
  }

  function handleHandlePointerUp(e: PointerEvent) {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;
    const movedFar = Math.abs(e.clientY - start.y) > 6;
    if (!movedFar) {
      // A tap, not a drag: toggle instead of snapping to whichever side
      // the (near-zero) drag distance happened to round to.
      setSheetRatio(sheetRatio === DEFAULT_SHEET_RATIO ? EXPANDED_SHEET_RATIO : DEFAULT_SHEET_RATIO);
    } else {
      const mid = (DEFAULT_SHEET_RATIO + EXPANDED_SHEET_RATIO) / 2;
      setSheetRatio((dragRatio ?? start.ratio) >= mid ? EXPANDED_SHEET_RATIO : DEFAULT_SHEET_RATIO);
    }
    setDragRatio(null);
  }

  // The menu's "The climb" / "The way home" links pass a day via navigation
  // state (see MenuSheet): land on that day's first moment, with no walking
  // animation -- it's an arrival, not a step.
  const scrollToDay = (location.state as { scrollToDay?: number } | null)?.scrollToDay ?? null;
  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    if (scrollToDay == null || handledRef.current === location.key) return;
    handledRef.current = location.key;
    const index = moments.findIndex((m) => m.dayId === scrollToDay);
    if (index >= 0) {
      skipAnimRef.current = true;
      setActiveIndex(index);
    }
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToDay, location.key]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (skipAnimRef.current || reducedMotion) {
      skipAnimRef.current = false;
      setIsWalking(false);
      return;
    }
    setIsWalking(true);
    const timer = setTimeout(() => setIsWalking(false), WALK_DURATION_S * 1000);
    return () => clearTimeout(timer);
  }, [activeIndex, reducedMotion]);

  const worldHeight = viewportSize.height;
  const { panels, worldWidth } = useMemo(() => computePanelLayout(worldHeight), [worldHeight]);
  const active = moments[activeIndex];
  const prevXRef = useRef<number | null>(null);

  const targetX = active ? active.x * worldWidth : 0;
  const targetY = active ? active.y * worldHeight : 0;
  useEffect(() => {
    if (prevXRef.current != null && targetX !== prevXRef.current) {
      setFacing(targetX >= prevXRef.current ? "right" : "left");
    }
    prevXRef.current = targetX;
  }, [targetX]);

  const viewportWidth = viewportSize.width;
  const cameraX = worldWidth > 0 ? Math.min(Math.max(targetX - viewportWidth / 2, 0), Math.max(worldWidth - viewportWidth, 0)) : 0;

  const momentsContent = useMomentsContent();
  const activeDetail = useMoment(active ? active.id : null);
  const activeText = active ? momentsContent.data?.moment[active.id] : undefined;
  const people = activeDetail.data?.people ?? [];
  // Moment 37 is the last stop on the trail -- its Next button leaves the
  // walk and heads into the credits instead of being a dead end.
  const isLastMoment = activeIndex === moments.length - 1;

  function goTo(index: number) {
    if (index < 0 || index >= moments.length) return;
    setSheetRatio(DEFAULT_SHEET_RATIO); // so the walk (map) is visible while it plays out
    setActiveIndex(index);
  }

  // No transition while actively dragging the sheet (so the map tracks the
  // finger 1:1) or in reduced motion; otherwise the usual walk/pan easing.
  const noWalkTransition = reducedMotion || dragging;
  const sheetTransition = reducedMotion || dragging ? "none" : "height 0.2s ease-out";

  return (
    <div ref={screenRef} className="mx-auto flex max-w-md flex-col" style={{ height: "calc(100dvh - var(--topbar-h))" }}>
      <div
        ref={viewportRef}
        // This container is clipped (overflow-hidden) but the camera pan
        // below is done entirely by hand via `transform: translateX`, never
        // by scrolling it -- so its own native scrollLeft must always stay
        // 0. Nothing here scrolls it on purpose, but overflow-hidden
        // doesn't stop focus/scrollIntoView (a keyboard Tab onto an
        // off-screen moment marker, or a testing tool clicking one
        // directly) from doing it anyway, which would then silently stack
        // with the transform pan. Reset it the instant it happens.
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollLeft !== 0 || el.scrollTop !== 0) el.scrollTo(0, 0);
        }}
        className="relative flex-shrink-0 overflow-hidden bg-bg-soft"
        style={{ height: `${(1 - effectiveRatio) * 100}%`, transition: sheetTransition }}
      >
        {worldHeight > 0 && (
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: worldWidth,
              height: worldHeight,
              transform: `translateX(${-cameraX}px)`,
              transition: noWalkTransition ? "none" : `transform ${WALK_DURATION_S}s ease-in-out`,
            }}
          >
            <MapPanels panels={panels} heightPx={worldHeight} />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-black"
              style={{ opacity: MAP_OVERLAY_STRENGTH }}
            />
            <TrailSvg moments={moments} worldWidth={worldWidth} worldHeight={worldHeight} />

            {moments.map((m, i) => (
              <MomentMarker
                key={m.id}
                moment={m}
                worldWidth={worldWidth}
                worldHeight={worldHeight}
                active={i === activeIndex}
                onSelect={() => goTo(i)}
              />
            ))}

            {people.length > 0 && <PeopleAtPoint people={people} anchorX={targetX} anchorY={targetY} />}

            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: targetX,
                top: targetY,
                transition: noWalkTransition
                  ? "none"
                  : `left ${WALK_DURATION_S}s ease-in-out, top ${WALK_DURATION_S}s ease-in-out`,
              }}
            >
              {isWalking ? (
                <Sprite fileName="ammar-walk.png" frameCount={4} initials="A" loop="walk" animate facing={facing} />
              ) : (
                <Sprite
                  fileName="ammar.png"
                  frameCount={2}
                  initials="A"
                  fallbackFileName="ammar-walk.png"
                  fallbackFrameCount={4}
                  loop="idle"
                  animate={!reducedMotion}
                  facing={facing}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-shrink-0" style={{ height: `${effectiveRatio * 100}%`, transition: sheetTransition }}>
        {active && (
          <MomentDialogueBox
            momentId={active.id}
            kind={active.kind}
            dayId={active.dayId}
            altitudeM={active.altitudeM}
            title={activeText?.title}
            story={activeText?.story}
            media={activeDetail.data?.media ?? []}
            loading={momentsContent.isLoading || activeDetail.isLoading}
            error={momentsContent.isError || activeDetail.isError}
            hasPrev={activeIndex > 0}
            hasNext={true}
            onPrev={() => goTo(activeIndex - 1)}
            onNext={() => (isLastMoment ? navigate("/credits") : goTo(activeIndex + 1))}
            expanded={sheetRatio === EXPANDED_SHEET_RATIO}
            onToggleExpand={() => setSheetRatio(sheetRatio === DEFAULT_SHEET_RATIO ? EXPANDED_SHEET_RATIO : DEFAULT_SHEET_RATIO)}
            onHandlePointerDown={handleHandlePointerDown}
            onHandlePointerMove={handleHandlePointerMove}
            onHandlePointerUp={handleHandlePointerUp}
          />
        )}
      </div>
    </div>
  );
}

// Fixed render height for the placement editor's map -- not scaled to fit
// the screen (37 markers at mobile width would shrink past anything
// tappable). The viewport scrolls horizontally instead, same as a real
// level editor; markers stay a comfortable, consistent hit size throughout.
const PLACEMENT_HEIGHT = 240;
const PLACEMENT_MARKER_SIZE = 22;

/** /climb?place=1 -- not linked anywhere. Shows every moment point along a
 * horizontally-scrollable map, draggable (or tap-to-select, then tap the
 * map to drop it there). "Copy JSON" gives back exactly moment-points.json's
 * shape, in trail order, ready to paste in. */
function PlacementEditor({ moments }: { moments: MapMoment[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => allMomentPoints());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const draggingId = useRef<string | null>(null);
  // A drag's mouseup synthesizes a trailing click wherever the pointer ends
  // up -- usually the background now that the marker has moved out from
  // under it -- which would otherwise immediately re-snap the point this
  // same gesture just freely dragged. Set the moment a drag actually moves
  // a point; the next background click consumes it instead of acting.
  const justDraggedRef = useRef(false);

  const { panels, worldWidth } = useMemo(() => computePanelLayout(PLACEMENT_HEIGHT), []);

  function fractionFromEvent(e: { clientX: number; clientY: number }) {
    const el = viewportRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left + el.scrollLeft) / worldWidth;
    const y = (e.clientY - rect.top + el.scrollTop) / PLACEMENT_HEIGHT;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }

  function setPosition(id: string, p: { x: number; y: number }) {
    setPositions((prev) => ({ ...prev, [id]: { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 } }));
  }

  // Tap-to-drop snaps to the path by default -- only x comes from where you
  // tapped. Dragging a marker directly (handleMarkerPointerMove) stays
  // freehand, so you can still pull a point off the path on purpose.
  function handleBackgroundClick(e: MouseEvent) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (!selectedId) return;
    const p = fractionFromEvent(e);
    if (p) setPosition(selectedId, { x: p.x, y: pathYForFraction(p.x) });
  }

  function handleMarkerPointerDown(id: string, e: PointerEvent) {
    e.stopPropagation();
    setSelectedId(id);
    draggingId.current = id;
    justDraggedRef.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleMarkerPointerMove(e: PointerEvent) {
    const id = draggingId.current;
    if (!id) return;
    justDraggedRef.current = true;
    const p = fractionFromEvent(e);
    if (p) setPosition(id, p);
  }

  function handleMarkerPointerUp() {
    draggingId.current = null;
  }

  async function copyJson() {
    const ordered: Record<string, { x: number; y: number }> = {};
    for (const m of moments) ordered[m.id] = positions[m.id] ?? pointForMoment(m.id, 0, 1);
    await navigator.clipboard.writeText(JSON.stringify(ordered, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-3" style={{ height: "calc(100dvh - var(--topbar-h))" }}>
      <p className="font-pixel text-[10px] text-ink-dim">
        Placement mode. Scroll to see the whole trail. Tap a point then tap the map to drop it on the path, or drag it directly to move it off the path.
      </p>
      <div
        ref={viewportRef}
        onClick={handleBackgroundClick}
        onPointerMove={handleMarkerPointerMove}
        onPointerUp={handleMarkerPointerUp}
        className="relative flex-1 overflow-auto bg-bg-soft"
      >
        <div className="relative" style={{ width: worldWidth, height: PLACEMENT_HEIGHT }}>
          <MapPanels panels={panels} heightPx={PLACEMENT_HEIGHT} />
          {moments.map((m) => {
            const p = positions[m.id] ?? pointForMoment(m.id, 0, 1);
            return (
              <button
                key={m.id}
                onPointerDown={(e) => handleMarkerPointerDown(m.id, e)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-panel font-pixel text-[8px]",
                  MOMENT_KIND_STYLES[m.kind],
                  selectedId === m.id && "ring-2 ring-accent-strong"
                )}
                style={{ left: p.x * worldWidth, top: p.y * PLACEMENT_HEIGHT, width: PLACEMENT_MARKER_SIZE, height: PLACEMENT_MARKER_SIZE }}
                title={m.id}
              >
                {m.dayId}
              </button>
            );
          })}
        </div>
      </div>
      <button
        onClick={copyJson}
        className="min-h-11 w-full border-2 border-panel-border bg-panel font-pixel text-xs text-ink"
      >
        {copied ? "Copied!" : "Copy JSON"}
      </button>
    </div>
  );
}
