import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionValueEvent, useScroll, useTransform, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useJourney } from "../hooks/useJourney";
import { useMomentsContent } from "../hooks/useMomentsContent";
import { useMoment } from "../hooks/useMoment";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDelayedVisible } from "../hooks/useDelayedVisible";
import { Sprite } from "../components/Sprite";
import { MomentDialogueBox } from "../components/MomentDialogueBox";
import { LoadingScreen } from "../components/LoadingScreen";
import { cn } from "../lib/utils";
import { landmarkForDay } from "../config/dayLandmarks";
import { MOMENT_KIND_STYLES } from "../lib/momentKindStyles";
import {
  buildMomentNodes,
  nodeIndexAtProgress,
  positionAlongPath,
  scrollYForProgress,
  totalHeight,
  CANVAS_WIDTH,
  type MomentMapNode,
  type MomentPathNode,
} from "../lib/path";

/** /climb: the moments-only walk -- all 37 moments in sort_order, Start ->
 * moment 1 -> ... -> moment 37, no day banners. Each moment node wears its
 * day's landmark sprite (same config DaysMap's day banners use). This is
 * the main "Begin the climb" path; the day-by-day walk lives at /story. */
export function MomentsMap() {
  const { data, isLoading } = useJourney();
  const reducedMotion = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeNode, setActiveNode] = useState<MomentMapNode | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const lastAutoOpenedIndex = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useMemo(() => (data ? buildMomentNodes(data.days) : []), [data]);
  const pageLoading = isLoading || !data || nodes.length === 0;

  // The menu's "The climb" / "The way home" links pass a day via navigation
  // state (see MenuSheet). Here that means "the first moment of that day",
  // since this path has no day nodes of its own to land on directly.
  const scrollToDay = (location.state as { scrollToDay?: number } | null)?.scrollToDay ?? null;
  const scrollHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (scrollToDay == null) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollToDay == null || pageLoading) return;
    if (scrollHandledRef.current === location.key) return;
    scrollHandledRef.current = location.key;
    const node = nodes.find(
      (n): n is MomentMapNode => n.kind === "moment" && n.dayId === scrollToDay
    );
    if (node) {
      openNode(node);
      scrollToMomentNode(node.moment.id);
    }
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
    if (index !== lastAutoOpenedIndex.current) {
      lastAutoOpenedIndex.current = index;
      const node = nodes[index]!;
      if (node.kind === "moment") {
        setActiveNode(node);
        setDialogueOpen(true);
      } else {
        // Scrolled back up to the start node: no story to show here.
        setDialogueOpen(false);
      }
    }
  });

  function openNode(node: MomentMapNode) {
    lastAutoOpenedIndex.current = nodes.indexOf(node);
    setActiveNode(node);
    setDialogueOpen(true);
  }

  const momentsContent = useMomentsContent();
  const activeMomentDetail = useMoment(dialogueOpen && activeNode ? activeNode.moment.id : null);
  const showLoader = useDelayedVisible(pageLoading);

  // In reduced motion, the character snaps to whichever node is active
  // instead of interpolating smoothly along the path as the user scrolls.
  const snappedNode = activeNode ?? nodes[0];
  const activeMomentText = activeNode ? momentsContent.data?.moment[activeNode.moment.id] : undefined;

  // Dialogue box Prev/Next: scrolls the page to the neighboring moment node
  // and stops there -- it never sets activeNode directly. The
  // scroll-progress listener above is what notices the new position and
  // opens its dialogue, same path a manual scroll or a menu jump link takes.
  const momentNodes = useMemo(() => nodes.filter((n): n is MomentMapNode => n.kind === "moment"), [nodes]);
  const activeMomentIndex = activeNode
    ? momentNodes.findIndex((n) => n.moment.id === activeNode.moment.id)
    : -1;
  const hasPrevMoment = activeMomentIndex > 0;
  const hasNextMoment = activeMomentIndex >= 0 && activeMomentIndex < momentNodes.length - 1;

  function scrollToMomentNode(id: string) {
    const index = nodes.findIndex((n) => n.kind === "moment" && n.moment.id === id);
    if (index < 0 || !containerRef.current || nodes.length < 2) return;
    const top = scrollYForProgress(containerRef.current, index / (nodes.length - 1));
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function handlePrevMoment() {
    if (hasPrevMoment) scrollToMomentNode(momentNodes[activeMomentIndex - 1]!.moment.id);
  }

  function handleNextMoment() {
    if (hasNextMoment) scrollToMomentNode(momentNodes[activeMomentIndex + 1]!.moment.id);
  }

  return (
    <div className="bg-bg">
      <div
        ref={containerRef}
        className="relative mx-auto"
        style={{ width: CANVAS_WIDTH, height: totalHeight(nodes) }}
      >
        <PathSvg nodes={nodes} />

        {nodes.map((node) =>
          node.kind === "moment" ? (
            <MomentNode
              key={node.moment.id}
              node={node}
              active={activeNode?.moment.id === node.moment.id}
              onSelect={() => openNode(node)}
            />
          ) : (
            <StartNode key="start" node={node} />
          )
        )}

        {!pageLoading && snappedNode && (
          reducedMotion ? (
            // No walking animation: the idle sprite just appears at each node, no interpolation.
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
                // Character has stopped at a moment's dialogue: switch to the idle, front-view loop.
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

      {activeNode && (
        <MomentDialogueBox
          open={dialogueOpen}
          onClose={() => setDialogueOpen(false)}
          momentId={activeNode.moment.id}
          kind={activeNode.moment.kind}
          dayId={activeNode.dayId}
          altitudeM={activeNode.altitudeM}
          title={activeMomentText?.title}
          story={activeMomentText?.story}
          hero={activeMomentDetail.data?.hero ?? null}
          people={activeMomentDetail.data?.people ?? []}
          photoCount={activeMomentDetail.data?.media.length ?? 0}
          loading={momentsContent.isLoading || activeMomentDetail.isLoading}
          error={momentsContent.isError || activeMomentDetail.isError}
          hasPrev={hasPrevMoment}
          hasNext={hasNextMoment}
          onPrev={handlePrevMoment}
          onNext={handleNextMoment}
        />
      )}

      {showLoader && <LoadingScreen />}
    </div>
  );
}

function PathSvg({ nodes }: { nodes: MomentPathNode[] }) {
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

/** A moment's spot on the path: its day's landmark sprite, with a small
 * kind-colored diamond badge in the corner (the dialogue's "Day n" header
 * carries the day number, so the node itself doesn't need to repeat it). */
function MomentNode({
  node,
  active,
  onSelect,
}: {
  node: MomentMapNode;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const configuredLandmark = landmarkForDay(node.dayId);
  // Flips back to the plain diamond marker if the configured PNG 404s, same
  // probe technique Sprite.tsx uses for its own fallback.
  const [landmarkFailed, setLandmarkFailed] = useState(false);
  const landmark = landmarkFailed ? null : configuredLandmark;

  if (!landmark) {
    return (
      <button
        id={`moment-node-${node.moment.id}`}
        onClick={onSelect}
        aria-label={t(`moment.${node.moment.kind}`)}
        className="absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: node.x, top: node.y, width: 44, height: 44 }}
      >
        <span
          className={cn(
            "block h-3 w-3 rotate-45 border-2 bg-bg-soft",
            MOMENT_KIND_STYLES[node.moment.kind],
            active && "bg-panel ring-2 ring-accent-strong"
          )}
        />
      </button>
    );
  }

  return (
    <button
      id={`moment-node-${node.moment.id}`}
      onClick={onSelect}
      aria-label={t(`moment.${node.moment.kind}`)}
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
          "absolute -bottom-1 -right-1 block h-4 w-4 rotate-45 border-2 bg-bg",
          MOMENT_KIND_STYLES[node.moment.kind],
          active && "bg-panel"
        )}
      />
    </button>
  );
}

/** Where the character stands before moment 1 begins: a landmark, not a moment -- no dialogue, not tappable. */
function StartNode({ node }: { node: Extract<MomentPathNode, { kind: "start" }> }) {
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
