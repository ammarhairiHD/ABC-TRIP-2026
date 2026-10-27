/** Generic 8x8 pixel-art glyphs for the About page's link buttons -- plain
 * shapes (camera, globe, profile card, play triangle, envelope), never an
 * official brand mark, so they're drawn by hand here instead of pulling in
 * real logos. Each row is 8 characters; "#" is a filled pixel. */
const ICONS = {
  camera: ["..####..", ".######.", "##....##", "#.####.#", "#.#..#.#", "#.####.#", "##....##", ".######."],
  globe: ["..####..", ".#....#.", "#.#..#.#", "########", "#.#..#.#", "#.#..#.#", ".#....#.", "..####.."],
  profile: ["########", "#......#", "#.####.#", "#.####.#", "#.####.#", "#.####.#", "#......#", "########"],
  play: ["########", "#......#", "#.#....#", "#.##...#", "#.###..#", "#.##...#", "#.#....#", "########"],
  envelope: ["########", "##....##", "#.##.#.#", "#.####.#", "#......#", "#......#", "#......#", "########"],
} as const;

export type PixelIconName = keyof typeof ICONS;

/** Renders one of the ICONS glyphs above as crisp SVG pixels, colored by
 * `currentColor` so it always matches the button text around it. */
export function PixelIcon({ name, size = 20 }: { name: PixelIconName; size?: number }) {
  const rows = ICONS[name];
  const cells: { x: number; y: number }[] = [];
  rows.forEach((row, y) => {
    row.split("").forEach((cell, x) => {
      if (cell === "#") cells.push({ x, y });
    });
  });

  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      aria-hidden
      shapeRendering="crispEdges"
      className="shrink-0 text-current"
    >
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}
