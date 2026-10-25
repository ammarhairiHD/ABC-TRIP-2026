import type { JourneyDay, JourneyMoment } from "../types/journey";

export type MapNode =
  | { kind: "start"; x: number; y: number }
  | { kind: "day"; day: JourneyDay; x: number; y: number };

export type DayMapNode = Extract<MapNode, { kind: "day" }>;

export type MomentPathNode =
  | { kind: "start"; x: number; y: number }
  | {
      kind: "moment";
      moment: JourneyMoment;
      dayId: number;
      altitudeM: number | null;
      x: number;
      y: number;
    };

export type MomentMapNode = Extract<MomentPathNode, { kind: "moment" }>;

export const SECTION_HEIGHT = 220;
// Moment markers on /climb sit closer together than day banners did --
// they're the only thing on that path now, not a smaller beat alongside days.
export const MOMENT_STEP = 110;
export const CANVAS_WIDTH = 390;
const PAD_X = 64;

/**
 * Lays out one node per day, after a leading "start" node (no day, no
 * dialogue) so the character has somewhere to stand before Day 1 instead of
 * spawning on top of it. y advances monotonically top-to-bottom in
 * chronological order (so the page scrolls through the trip in order), x
 * leans toward the real altitude for that day (0-1 normalized across the
 * whole trip) so the path's shape traces the climb and descent -- Day 5 /
 * ABC juts furthest since it's the altitude peak. The start node sits
 * directly above Day 1's x so the first steps down the path are a straight
 * line onto the trail. Used by /story, the day-by-day walk.
 */
export function buildDayNodes(days: JourneyDay[]): MapNode[] {
  const altitudes = days.map((d) => d.altitudeM ?? 0);
  const min = Math.min(...altitudes);
  const max = Math.max(...altitudes);
  const span = max - min || 1;

  const dayNodes: MapNode[] = days.map((day, i) => {
    const normalized = ((day.altitudeM ?? min) - min) / span;
    return {
      kind: "day",
      day,
      x: PAD_X + normalized * (CANVAS_WIDTH - PAD_X * 2),
      y: (i + 1) * SECTION_HEIGHT + SECTION_HEIGHT / 2,
    };
  });

  const startNode: MapNode = {
    kind: "start",
    x: dayNodes[0]?.x ?? CANVAS_WIDTH / 2,
    y: SECTION_HEIGHT / 2,
  };

  return [startNode, ...dayNodes];
}

/**
 * Lays out one node per moment, in sort_order, after a leading "start" node
 * -- no day banners. x still leans on that moment's day's altitude (so the
 * path's shape keeps tracing the climb and descent); a day's moments share
 * its x, the same x a day banner would have had. Used by /climb, the
 * moments-only walk.
 */
export function buildMomentNodes(days: JourneyDay[]): MomentPathNode[] {
  const altitudes = days.map((d) => d.altitudeM ?? 0);
  const min = Math.min(...altitudes);
  const max = Math.max(...altitudes);
  const span = max - min || 1;

  const xForDay = new Map<number, number>();
  for (const day of days) {
    const normalized = ((day.altitudeM ?? min) - min) / span;
    xForDay.set(day.id, PAD_X + normalized * (CANVAS_WIDTH - PAD_X * 2));
  }

  const momentNodes: MomentMapNode[] = [];
  let y = SECTION_HEIGHT / 2;
  for (const day of days) {
    for (const moment of day.moments) {
      y += MOMENT_STEP;
      momentNodes.push({
        kind: "moment",
        moment,
        dayId: day.id,
        altitudeM: day.altitudeM,
        x: xForDay.get(day.id) ?? CANVAS_WIDTH / 2,
        y,
      });
    }
  }

  const startNode: MomentPathNode = {
    kind: "start",
    x: momentNodes[0]?.x ?? CANVAS_WIDTH / 2,
    y: SECTION_HEIGHT / 2,
  };

  return [startNode, ...momentNodes];
}

export function totalHeight(nodes: { y: number }[]): number {
  const last = nodes[nodes.length - 1];
  return (last?.y ?? 0) + SECTION_HEIGHT / 2;
}

/** Piecewise-linear position along the node chain at scroll progress 0-1. */
export function positionAlongPath<T extends { x: number; y: number }>(
  nodes: T[],
  progress: number
) {
  if (nodes.length === 0) return { x: CANVAS_WIDTH / 2, y: 0, facing: "right" as const };
  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (nodes.length - 1);
  const i = Math.min(nodes.length - 2, Math.floor(scaled));
  const a = nodes[i]!;
  const b = nodes[Math.min(nodes.length - 1, i + 1)]!;
  const t = scaled - i;

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    facing: (b.x >= a.x ? "right" : "left") as "right" | "left",
  };
}

/** Index into `nodes` of whichever node the character is currently standing at. */
export function nodeIndexAtProgress<T>(nodes: T[], progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.round(clamped * (nodes.length - 1));
}
