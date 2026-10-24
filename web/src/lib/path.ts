import type { JourneyDay } from "../types/journey";

export interface MapNode {
  day: JourneyDay;
  x: number;
  y: number;
}

export const SECTION_HEIGHT = 220;
export const CANVAS_WIDTH = 390;
const PAD_X = 64;

/**
 * Lays out one node per day: y advances monotonically top-to-bottom in
 * chronological order (so the page scrolls through the trip in order), x
 * leans toward the real altitude for that day (0-1 normalized across the
 * whole trip) so the path's shape traces the climb and descent — Day 5 /
 * ABC juts furthest since it's the altitude peak.
 */
export function buildNodes(days: JourneyDay[]): MapNode[] {
  const altitudes = days.map((d) => d.altitudeM ?? 0);
  const min = Math.min(...altitudes);
  const max = Math.max(...altitudes);
  const span = max - min || 1;

  return days.map((day, i) => {
    const normalized = ((day.altitudeM ?? min) - min) / span;
    return {
      day,
      x: PAD_X + normalized * (CANVAS_WIDTH - PAD_X * 2),
      y: i * SECTION_HEIGHT + SECTION_HEIGHT / 2,
    };
  });
}

export function totalHeight(nodes: MapNode[]): number {
  return nodes.length * SECTION_HEIGHT;
}

/** Piecewise-linear position along the node chain at scroll progress 0-1. */
export function positionAlongPath(nodes: MapNode[], progress: number) {
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

export function dayIndexAtProgress(nodes: MapNode[], progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.round(clamped * (nodes.length - 1));
}
