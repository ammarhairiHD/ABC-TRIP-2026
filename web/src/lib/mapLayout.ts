import momentPoints from "../data/moment-points.json";

/** The /climb map is one wide image, 4 panels side by side at
 * web/public/map/map-1..4.png -- see CLAUDE.md's sprite contract for how
 * real art drops in later (nearest-neighbour scaled to this aspect ratio,
 * one consistent height). Placeholders ship at this same ratio so swapping
 * in real art later doesn't change any layout math here. */
export const PANEL_COUNT = 4;
export const PANEL_ASPECT = 4 / 3;

export function mapPanelSrc(n: number): string {
  return `/map/map-${n}.png`;
}

export interface MomentPoint {
  x: number;
  y: number;
}

/** A moment's spot on the trail, as a fraction (0-1) of the full 4-panel
 * map. Falls back to an evenly-spaced placeholder for any moment not yet in
 * moment-points.json (e.g. a newly added moment), so the map never breaks
 * waiting on a manual placement pass. */
export function pointForMoment(id: string, index: number, total: number): MomentPoint {
  const known = (momentPoints as Record<string, MomentPoint>)[id];
  if (known) return known;
  return { x: total > 1 ? (index + 0.5) / total : 0.5, y: 0.6 };
}

export function allMomentPoints(): Record<string, MomentPoint> {
  return momentPoints as Record<string, MomentPoint>;
}
