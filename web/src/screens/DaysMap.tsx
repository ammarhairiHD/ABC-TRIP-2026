import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionValueEvent, useScroll, useTransform, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useJourney } from "../hooks/useJourney";
import { useDayContent } from "../hooks/useDayContent";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { Sprite } from "../components/Sprite";
import { DialogueBox } from "../components/DialogueBox";
import { LoadingScreen } from "../components/LoadingScreen";
import { cn } from "../lib/utils";
import { landmarkForDay } from "../config/dayLandmarks";
import {
  buildDayNodes,
  nodeIndexAtProgress,
  positionAlongPath,
  totalHeight,
  CANVAS_WIDTH,
  type DayMapNode,
  type MapNode,
} from "../lib/path";

/** /story: the day-by-day walk, 11 day banners with the day's story and
 * "See all photos" into its gallery. This is the original journey map from
 * before moments got their own /climb path -- recovered as-is, just renamed
 * off JourneyMap since that name now belongs to the moments walk. */
export function DaysMap() {
  const { data, isLoading } = useJourney();
  const reducedMotion = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const lastAutoOpenedDay = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useMemo(() => (data ? buildDayNodes(data.days) : []), [data]);
  const pageLoading = isLoading || !data || nodes.length === 0;

  // The menu's "The climb" / "The way home" links pass the day to land on
  // via navigation state (see MenuSheet). Read it once per navigation, then
  // clear it below so popping back here later doesn't re-trigger it.
  const scrollToDay = (location.state as { scrollToDay?: number } | null)?.scrollToDay ?? null;
  // Keyed on location.key (unique per navigation) rather than the day
  // number, so clicking the same menu link twice in a row -- e.g. after
  // scrolling away -- still re-scrolls instead of silently no-op'ing.
  const scrollHandledRef = useRef<string | null>(null);

  // Arriving fresh (no requested day) shouldn't inherit whatever scroll
  // position the previous page happened to be at -- that threw off the
  // scroll-progress math this map is built on. Runs once, using whatever
  // scrollToDay was present at mount.
  useEffect(() => {
    if (scrollToDay == null) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollToDay == null || pageLoading) return;
    if (scrollHandledRef.current === location.key) return;
    scrollHandledRef.current = location.key;
    openDay(scrollToDay);
    document
      .getElementById(`day-node-${scrollToDay}`)
      ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToDay, pageLoading, location.key]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const characterX = useTransform(scrollYProgress, (p) => positionAlongPath(nodes, p).x);
  const characterY = useTransform(scrollYProgress, (p) => positionAlongPath(nodes, p).y);
  const [facing, setFacing] = useState<"left" | "right">("right");

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (nodes.length === 0) return;
    setFacing(positionAlongPath(nodes, progress).facing);

    const index = nodeIndexAtProgress(nodes, progress);
    if (index !== lastAutoOpenedDay.current) {
      lastAutoOpenedDay.current = index;
      const node = nodes[index]!;
      if (node.kind === "day") {
        setActiveDay(node.day.id);
        setDialogueOpen(true);
      } else {
        // Scrolled back up to the start node: no story to show here.
        setDialogueOpen(false);
      }
    }
  });

  function openDay(dayId: number) {
    lastAutoOpenedDay.current = nodes.findIndex((n) => n.kind === "day" && n.day.id === dayId);
    setActiveDay(dayId);
    setDialogueOpen(true);
  }

  const activeContent = useDayContent(dialogueOpen ? activeDay : null);
  const activeNode = nodes.find((n): n is DayMapNode => n.kind === "day" && n.day.id === activeDay);
  const showLoader = useDelayedVisible(pageLoading);

  // In reduced motion, the character snaps to whichever day node is active
  // instead of interpolating smoothly along the path as the user scrolls.
  const snappedNode = activeNode ?? nodes[0];

  return (
    <div className="bg-bg">
      {/*
        This container stays mounted even while pageLoading (LoadingScreen
        renders as an overlay below, not a replacement) so containerRef
        attaches on the very first render. useScroll's ref-hydration retry
        only runs once; if the ref were still null when it fires -- which it
        would be if this div only mounted once data arrived -- scroll
        tracking never attaches and the sprite/dialogue stop responding to
        scroll entirely after a client-side navigation here.
      */}
      <div
        ref={containerRef}
        className="relative mx-auto"
        style={{ width: CANVAS_WIDTH, height: totalHeight(nodes) }}
      >
        <PathSvg nodes={nodes} />

        {nodes.map((node) =>
          node.kind === "day" ? (
            <DayNode
              key={node.day.id}
              node={node}
              active={node.day.id === activeDay}
              onSelect={() => openDay(node.day.id)}
            />
          ) : (
            <StartNode key="start" node={node} />
          )
        )}

        {!pageLoading && snappedNode && (
          reducedMotion ? (
            // No walking animation: the idle sprite just appears at each day, no interpolation.
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: snappedNode.x, top: snappedNode.y }}
            >
              <Sprite
                fileName="ammar.png"
                frameCount={2}
                initials="A"
                fallbackFileName="ammar-walk.png"
                fallbackFrameCount={4}
                animate={false}
              />
            </div>
          ) : (
            <motion.div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: characterX, top: characterY }}
            >
              {dialogueOpen ? (
                // Character has stopped at a day's dialogue: switch to the idle, front-view loop.
                <Sprite
                  fileName="ammar.png"
                  frameCount={2}
                  initials="A"
                  fallbackFileName="ammar-walk.png"
                  fallbackFrameCount={4}
                  loop="idle"
                  animate
                  facing={facing}
                />
              ) : (
                <Sprite fileName="ammar-walk.png" frameCount={4} initials="A" loop="walk" animate facing={facing} />
              )}
            </motion.div>
          )
        )}
      </div>

      <DialogueBox
        open={dialogueOpen}
        onClose={() => setDialogueOpen(false)}
        dayNumber={activeDay ?? 1}
        altitudeM={activeNode?.day.altitudeM ?? null}
        mediaCount={activeNode?.day.mediaCount}
        title={activeContent.data?.title}
        story={activeContent.data?.story}
        loading={activeContent.isLoading}
        error={activeContent.isError}
      />

      {showLoader && <LoadingScreen />}
    </div>
  );
}

function PathSvg({ nodes }: { nodes: MapNode[] }) {
  const points = nodes.map((n) => `${n.x},${n.y}`).join(" ");
  return (
    <svg
      className="absolute inset-0"
      width={CANVAS_WIDTH}
      height={totalHeight(nodes)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-path)"
        strokeWidth={3}
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DayNode({
  node,
  active,
  onSelect,
}: {
  node: DayMapNode;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const configuredLandmark = landmarkForDay(node.day.id);
  // Flips back to the plain box if the configured PNG 404s, same probe
  // technique Sprite.tsx uses for its own fallback.
  const [landmarkFailed, setLandmarkFailed] = useState(false);
  const landmark = landmarkFailed ? null : configuredLandmark;
  const halfColor = node.day.half === "climb" ? "border-accent text-accent-strong" : "border-clay text-clay";

  if (!landmark) {
    return (
      <button
        id={`day-node-${node.day.id}`}
        onClick={onSelect}
        aria-label={t("climb.day", { n: node.day.id })}
        className={cn(
          "absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center",
          "rounded-sm border-2 font-pixel text-[10px]",
          halfColor,
          active ? "bg-panel" : "bg-bg-soft"
        )}
        style={{ left: node.x, top: node.y, width: 44, height: 44 }}
      >
        {node.day.id}
      </button>
    );
  }

  return (
    <button
      id={`day-node-${node.day.id}`}
      onClick={onSelect}
      aria-label={t("climb.day", { n: node.day.id })}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded-sm",
        active && "ring-2 ring-accent-strong"
      )}
      style={{ left: node.x, top: node.y, width: 64, height: 64 }}
    >
      <img
        src={`/sprites/${landmark}.png`}
        alt=""
        aria-hidden
        draggable={false}
        className="h-full w-full pixelated"
        style={{ imageRendering: "pixelated" }}
        onError={() => setLandmarkFailed(true)}
      />
      <span
        className={cn(
          "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center",
          "rounded-sm border-2 bg-bg font-pixel text-[9px]",
          halfColor
        )}
      >
        {node.day.id}
      </span>
    </button>
  );
}

/** Where the character stands before Day 1 begins: a landmark, not a day -- no dialogue, not tappable. */
function StartNode({ node }: { node: Extract<MapNode, { kind: "start" }> }) {
  const { t } = useTranslation();
  return (
    <div
      aria-hidden
      className={cn(
        "absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center",
        "rounded-sm border-2 border-dashed border-ink-dim bg-bg-soft font-pixel text-[9px] text-ink-dim"
      )}
      style={{ left: node.x, top: node.y, width: 44, height: 44 }}
    >
      {t("climb.start")}
    </div>
  );
}
