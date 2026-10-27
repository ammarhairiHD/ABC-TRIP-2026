import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { motion } from "motion/react";
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
import { landmarkForDay } from "../config/dayLandmarks";
import { MOMENT_KIND_STYLES } from "../lib/momentKindStyles";
import { initials } from "../lib/initials";
import { flattenMoments, type FlatMoment } from "../lib/moments";
import { PANEL_COUNT, PANEL_ASPECT, mapPanelSrc, pointForMoment, allMomentPoints } from "../lib/mapLayout";

const MARKER_SIZE = 40;
const WALK_DURATION_S = 0.6;
const MAX_PEOPLE_SHOWN = 6;

interface MapMoment extends FlatMoment {
  x: number; // fraction, 0-1
  y: number; // fraction, 0-1
}

/** /climb: the horizontal, RPG-style walk across all 37 moments. The map
 * is one wide image (4 panels) the camera pans across as the player steps
 * Next/Prev; the moment dialogue is permanently docked under it, since
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

/** The 4 map panels, laid side by side, each scaled to fill `heightPx` while
 * keeping PANEL_ASPECT -- shared by the normal walk and the placement
 * editor so both agree on where a given (x, y) fraction actually lands. */
function MapPanels({ heightPx }: { heightPx: number }) {
  return (
    <div className="flex" style={{ height: heightPx }}>
      {Array.from({ length: PANEL_COUNT }, (_, i) => (
        <img
          key={i}
          src={mapPanelSrc(i + 1)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated flex-shrink-0 object-cover"
          style={{ height: heightPx, width: heightPx * PANEL_ASPECT, imageRendering: "pixelated" }}
        />
      ))}
    </div>
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
  const configuredLandmark = landmarkForDay(moment.dayId);
  const [landmarkFailed, setLandmarkFailed] = useState(false);
  const landmark = landmarkFailed ? null : configuredLandmark;
  const left = moment.x * worldWidth;
  const top = moment.y * worldHeight;

  return (
    <button
      id={`moment-node-${moment.id}`}
      onClick={onSelect}
      aria-label={t(`moment.${moment.kind}`)}
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm",
        active && "ring-2 ring-accent-strong"
      )}
      style={{ left, top, width: MARKER_SIZE, height: MARKER_SIZE }}
    >
      {landmark ? (
        <img
          src={`/sprites/${landmark}.png`}
          alt=""
          aria-hidden
          draggable={false}
          className="h-full w-full pixelated"
          style={{ imageRendering: "pixelated" }}
          onError={() => setLandmarkFailed(true)}
        />
      ) : (
        <span className={cn("block h-3 w-3 rotate-45 border-2 bg-bg-soft", MOMENT_KIND_STYLES[moment.kind])} />
      )}
      <span
        className={cn(
          "absolute -bottom-1 -right-1 block h-3 w-3 rotate-45 border-2 bg-bg",
          MOMENT_KIND_STYLES[moment.kind]
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
  // Each slot gets a fixed-width lane (nickname truncates to fit it) so
  // names can't bleed into their neighbours even at 6-7 people wide.
  const spacing = 44;
  const startX = anchorX - ((slots.length - 1) * spacing) / 2;
  const y = anchorY - MARKER_SIZE / 2 - 34;

  return (
    <>
      {slots.map((person, i) => {
        const x = startX + i * spacing;
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
            style={{ left: x, top: y, width: spacing }}
          >
            <span className="w-full truncate text-center font-pixel text-[7px] leading-none text-ink">
              {person.nickname}
            </span>
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

/** The real /climb screen: map area (~60% of the viewport below the top
 * bar) with the camera panning to keep the sprite in view, and the moment
 * dialogue docked below it (~40%). */
function ClimbWalk({ moments }: { moments: MapMoment[] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { ref: viewportRef, size: viewportSize } = useElementSize<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);
  const skipAnimRef = useRef(false);
  const mountedRef = useRef(false);

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
  const worldWidth = worldHeight * PANEL_ASPECT * PANEL_COUNT;
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

  function goTo(index: number) {
    if (index < 0 || index >= moments.length) return;
    setActiveIndex(index);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col" style={{ height: "calc(100dvh - var(--topbar-h))" }}>
      <div ref={viewportRef} className="relative flex-[3] overflow-hidden bg-bg-soft">
        {worldHeight > 0 && (
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ width: worldWidth, height: worldHeight }}
            animate={{ x: -cameraX }}
            transition={{ duration: reducedMotion ? 0 : WALK_DURATION_S, ease: "easeInOut" }}
          >
            <MapPanels heightPx={worldHeight} />
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

            <motion.div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              animate={{ left: targetX, top: targetY }}
              transition={{ duration: reducedMotion ? 0 : WALK_DURATION_S, ease: "easeInOut" }}
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
            </motion.div>
          </motion.div>
        )}
      </div>

      <div className="flex-[2] min-h-0">
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
            hasNext={activeIndex < moments.length - 1}
            onPrev={() => goTo(activeIndex - 1)}
            onNext={() => goTo(activeIndex + 1)}
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

  const worldWidth = PLACEMENT_HEIGHT * PANEL_ASPECT * PANEL_COUNT;

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

  function handleBackgroundClick(e: MouseEvent) {
    if (!selectedId) return;
    const p = fractionFromEvent(e);
    if (p) setPosition(selectedId, p);
  }

  function handleMarkerPointerDown(id: string, e: PointerEvent) {
    e.stopPropagation();
    setSelectedId(id);
    draggingId.current = id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleMarkerPointerMove(e: PointerEvent) {
    const id = draggingId.current;
    if (!id) return;
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
        Placement mode. Scroll to see the whole trail. Tap a point then tap the map to drop it, or drag it directly.
      </p>
      <div
        ref={viewportRef}
        onClick={handleBackgroundClick}
        onPointerMove={handleMarkerPointerMove}
        onPointerUp={handleMarkerPointerUp}
        className="relative flex-1 overflow-auto bg-bg-soft"
      >
        <div className="relative" style={{ width: worldWidth, height: PLACEMENT_HEIGHT }}>
          <MapPanels heightPx={PLACEMENT_HEIGHT} />
          {moments.map((m) => {
            const p = positions[m.id] ?? pointForMoment(m.id, 0, 1);
            return (
              <button
                key={m.id}
                onPointerDown={(e) => handleMarkerPointerDown(m.id, e)}
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
