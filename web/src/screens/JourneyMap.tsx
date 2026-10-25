import { useMemo, useRef, useState } from "react";
import { useMotionValueEvent, useScroll, useTransform, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useJourney } from "../hooks/useJourney";
import { useDayContent } from "../hooks/useDayContent";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Sprite } from "../components/Sprite";
import { DialogueBox } from "../components/DialogueBox";
import { cn } from "../lib/utils";
import {
  buildNodes,
  dayIndexAtProgress,
  positionAlongPath,
  totalHeight,
  CANVAS_WIDTH,
  type DayMapNode,
  type MapNode,
} from "../lib/path";

export function JourneyMap() {
  const { t } = useTranslation();
  const { data, isLoading } = useJourney();
  const reducedMotion = useReducedMotion();
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const lastAutoOpenedDay = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useMemo(() => (data ? buildNodes(data.days) : []), [data]);

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

    const index = dayIndexAtProgress(nodes, progress);
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

  if (isLoading || !data || nodes.length === 0) {
    return <div className="flex min-h-screen items-center justify-center text-ink-dim">{t("common.loading")}</div>;
  }

  // In reduced motion, the character snaps to whichever day node is active
  // instead of interpolating smoothly along the path as the user scrolls.
  const snappedNode = activeNode ?? nodes[0]!;

  return (
    <div className="bg-bg">
      <div ref={containerRef} className="relative mx-auto" style={{ width: CANVAS_WIDTH, height: totalHeight(nodes) }}>
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

        {reducedMotion ? (
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
  return (
    <button
      onClick={onSelect}
      aria-label={t("climb.day", { n: node.day.id })}
      className={cn(
        "absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center",
        "rounded-sm border-2 font-pixel text-[10px]",
        node.day.half === "climb" ? "border-accent text-accent-strong" : "border-clay text-clay",
        active ? "bg-panel" : "bg-bg-soft"
      )}
      style={{ left: node.x, top: node.y, width: 44, height: 44 }}
    >
      {node.day.id}
    </button>
  );
}

/** Where the character stands before Day 1 begins: a landmark, not a day — no dialogue, not tappable. */
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
