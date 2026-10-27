import momentPoints from "../data/moment-points.json";
import mapPanelManifest from "../data/map-panels.json";

/** The /climb map is one wide image, N panels side by side at
 * web/public/map/map-1..N.webp (see scripts/convert-map-panels.mjs) -- a
 * dirt path runs along the bottom of each one. Panels aren't assumed
 * to share one aspect ratio; their native width/height (at the shared
 * export height) is recorded in map-panels.json and used directly here. */
export const PANEL_COUNT = mapPanelManifest.length;

/** How much of each panel's rendered height its left edge overlaps the
 * previous panel by, and fades in across -- the crossfade that hides the
 * seam. A fraction of render height, not raw px, so it scales with however
 * big the map is currently drawn (full /climb vs. the placement editor). */
export const OVERLAP_RATIO = 0.08;

export interface MapPanel {
  file: string;
  width: number;
  height: number;
  /** Where this panel's ground level sits, as a fraction of panel height
   * (0 = top, 1 = bottom) -- measured per panel by
   * scripts/convert-map-panels.mjs (each panel is a real painted scene, so
   * the path isn't drawn at the same height everywhere: a bridge deck
   * sits differently than a village street). Moments, the sprite, and
   * placement mode's tap-to-drop all default here so nothing floats off
   * the path; dragging a point in placement mode can still override it. */
  pathY: number;
}

export interface PanelLayout {
  file: string;
  left: number;
  width: number;
}

/** Lays out every panel left-to-right at `renderHeight`, each one scaled to
 * that height (keeping its own aspect ratio) and overlapping the previous
 * panel by OVERLAP_RATIO * renderHeight -- the zone MapPanels crossfades
 * across. Returns each panel's left/width in that same pixel space, plus
 * the total world width so callers can position the trail, markers and
 * camera against the identical coordinates. */
export function computePanelLayout(renderHeight: number): { panels: PanelLayout[]; worldWidth: number } {
  if (renderHeight <= 0) return { panels: [], worldWidth: 0 };
  const overlapPx = renderHeight * OVERLAP_RATIO;
  const panels: PanelLayout[] = [];
  let cursor = 0;
  for (const p of mapPanelManifest as MapPanel[]) {
    const width = (p.width / p.height) * renderHeight;
    panels.push({ file: p.file, left: cursor, width });
    cursor += width - overlapPx;
  }
  const last = panels[panels.length - 1];
  const worldWidth = last ? last.left + last.width : 0;
  return { panels, worldWidth };
}

// A fixed-scale reference layout, computed once -- panel left/width values
// scale linearly with renderHeight, so their *fractions* of worldWidth
// (which is all pathYForFraction needs) are the same at any render size.
// This lets pathYForFraction work from a plain 0-1 x fraction without the
// caller having to know the actual on-screen render height.
const REFERENCE_LAYOUT = computePanelLayout(1);

/** Each panel's ground level (MapPanel.pathY), looked up by a 0-1 x
 * fraction of the whole map. Inside a panel, that's just its own pathY;
 * inside the crossfade zone between two panels (see OVERLAP_RATIO), it's
 * linearly interpolated between the two so the path doesn't visibly step
 * up or down right where the seam fades -- same zone, same idea as the
 * crossfade itself. */
export function pathYForFraction(xFraction: number): number {
  const { panels, worldWidth } = REFERENCE_LAYOUT;
  const manifest = mapPanelManifest as MapPanel[];
  const last = manifest[manifest.length - 1];
  if (panels.length === 0 || worldWidth <= 0 || !last) return 0.9;
  const x = Math.min(1, Math.max(0, xFraction)) * worldWidth;
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const next = panels[i + 1];
    const current = manifest[i];
    if (!panel || !current) continue;
    if (!next) return current.pathY;
    const nextManifest = manifest[i + 1];
    if (!nextManifest) return current.pathY;
    const overlapStart = next.left;
    const panelRight = panel.left + panel.width;
    if (x < overlapStart) return current.pathY;
    if (x <= panelRight) {
      const t = (x - overlapStart) / (panelRight - overlapStart || 1);
      return current.pathY + (nextManifest.pathY - current.pathY) * t;
    }
    // else x is past this panel's zone entirely -- keep scanning forward.
  }
  return last.pathY;
}

export interface MomentPoint {
  x: number;
  y: number;
}

/** A moment's spot on the trail, as a fraction (0-1) of the full map. Falls
 * back to an evenly-spaced placeholder on the path for any moment not yet
 * in moment-points.json (e.g. a newly added moment), so the map never
 * breaks waiting on a manual placement pass. */
export function pointForMoment(id: string, index: number, total: number): MomentPoint {
  const known = (momentPoints as Record<string, MomentPoint>)[id];
  if (known) return known;
  const x = total > 1 ? (index + 0.5) / total : 0.5;
  return { x, y: pathYForFraction(x) };
}

export function allMomentPoints(): Record<string, MomentPoint> {
  return momentPoints as Record<string, MomentPoint>;
}
