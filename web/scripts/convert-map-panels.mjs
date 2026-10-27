#!/usr/bin/env node
/**
 * Converts the raw /climb map panels into the crisp, consistent-height
 * WebP images the site actually serves, plus the manifest (map-panels.json)
 * the app reads to lay them out and to know where each panel's ground
 * level sits -- panels aren't assumed to share one aspect ratio in the
 * output math (their rendered widths at the shared height are recorded
 * explicitly), but the *source* panels are required to share one aspect
 * ratio: they're meant to be the same side-view strip shot at different
 * points on the trail, and a mismatched one is almost always a mistake
 * (wrong crop, wrong export), so this fails loudly instead of silently
 * stretching it.
 *
 * sprites-raw/ is Ammar's source art folder: this script only ever reads
 * from it, never writes into it.
 *
 * Unlike abc-face-tools/sprite_fix.py (which removes a chroma-key
 * background and crops individual sprite frames out of an AI-generated
 * sheet), a map panel is already one full background image with nothing to
 * crop out -- this just needs a nearest-neighbour resize to one shared
 * height so every panel lines up edge to edge, with pixel edges kept sharp.
 *
 * Each panel also gets its ground level measured (see detectPathTop below)
 * and recorded as `pathY` (0-1, fraction of panel height) -- the dirt path
 * isn't drawn at the same height in every panel (a suspension bridge's deck
 * sits differently than a village street), so the app looks this up per
 * panel (see src/lib/mapLayout.ts's pathYForFraction) instead of using one
 * constant for the whole map.
 *
 * Usage (from web/):
 *   node scripts/convert-map-panels.mjs [--height 540] [--quality 0.72]
 *
 * Reads  ../sprites-raw/map-1.{png,jpg,jpeg}, map-2.{...}, ... (any count,
 *        in order -- gitignored staging dir, same convention as the
 *        character sprites). Read-only.
 * Writes public/map/map-1.webp, map-2.webp, ...
 *        src/data/map-panels.json  (the manifest -- commit this)
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const rawDir = join(webRoot, "..", "sprites-raw");
const outDir = join(webRoot, "public", "map");
const manifestPath = join(webRoot, "src", "data", "map-panels.json");

const MIME_BY_EXT = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
// Two source panels are "the same aspect ratio" if they're within this much
// relative difference -- loose enough to absorb a stray export pixel or two,
// tight enough to catch a genuinely different crop/aspect.
const ASPECT_TOLERANCE = 0.01;

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const targetHeight = argValue("--height", 540);
// 0.72 checked by eye against all 9 real panels at this resolution: no
// visible artifacts even on the busiest one (bamboo forest), ~20% smaller
// than 0.82 -- worth it on a phone connection for art that's lazy-loaded
// panel by panel as the camera approaches anyway.
const quality = argValue("--quality", 0.72);
if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
  console.error("convert-map-panels: --height must be a positive number");
  process.exit(1);
}
if (!Number.isFinite(quality) || quality <= 0 || quality > 1) {
  console.error("convert-map-panels: --quality must be between 0 and 1");
  process.exit(1);
}

if (!existsSync(rawDir)) {
  console.error(`convert-map-panels: ${rawDir} doesn't exist -- drop your raw map-N panels there first`);
  process.exit(1);
}

// index -> { file, ext } ; fails loudly below on gaps or an index claimed by
// more than one extension (e.g. both map-3.png and map-3.jpg present).
const byIndex = new Map();
const duplicates = [];
for (const f of readdirSync(rawDir)) {
  const m = /^map-(\d+)\.(png|jpe?g)$/i.exec(f);
  if (!m) continue;
  const n = Number(m[1]);
  if (byIndex.has(n)) duplicates.push([byIndex.get(n).file, f]);
  else byIndex.set(n, { file: f, ext: extname(f).toLowerCase() });
}

if (byIndex.size === 0) {
  console.error(`convert-map-panels: no map-N.{png,jpg,jpeg} files found in ${rawDir}`);
  process.exit(1);
}
if (duplicates.length > 0) {
  console.error(
    "convert-map-panels: more than one file claims the same panel number:\n" +
      duplicates.map(([a, b]) => `  ${a} and ${b}`).join("\n")
  );
  process.exit(1);
}

const maxIndex = Math.max(...byIndex.keys());
const missing = [];
for (let n = 1; n <= maxIndex; n++) if (!byIndex.has(n)) missing.push(n);
if (missing.length > 0) {
  console.error(
    `convert-map-panels: missing panel${missing.length > 1 ? "s" : ""} ${missing.join(", ")} ` +
      `(found 1-${maxIndex} with gaps -- panels must be contiguous, map-1 through map-${maxIndex})`
  );
  process.exit(1);
}

const panels = Array.from({ length: maxIndex }, (_, i) => byIndex.get(i + 1));

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

// --- Pass 1: load every source image, validate dimensions/aspect ratio ---
const loaded = [];
for (const { file, ext } of panels) {
  const srcPath = join(rawDir, file);
  const dataUrl = `data:${MIME_BY_EXT[ext]};base64,${readFileSync(srcPath).toString("base64")}`;
  const { naturalWidth, naturalHeight } = await page.evaluate(
    (dataUrl) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
        img.onerror = () => reject(new Error("failed to decode"));
        img.src = dataUrl;
      }),
    dataUrl
  );
  loaded.push({ file, dataUrl, naturalWidth, naturalHeight, aspect: naturalWidth / naturalHeight });
}

const refAspect = loaded[0].aspect;
const mismatched = loaded.filter((p) => Math.abs(p.aspect - refAspect) / refAspect > ASPECT_TOLERANCE);
if (mismatched.length > 0) {
  console.error(
    "convert-map-panels: panels don't share one aspect ratio:\n" +
      loaded.map((p) => `  ${p.file}: ${p.naturalWidth}x${p.naturalHeight} (aspect ${p.aspect.toFixed(4)})`).join("\n") +
      `\n${loaded[0].file} is ${refAspect.toFixed(4)} -- the rest must match within ${(ASPECT_TOLERANCE * 100).toFixed(0)}%.`
  );
  process.exit(1);
}

// --- Pass 2: resize + measure path height + encode ---
const manifest = [];
for (let i = 0; i < loaded.length; i++) {
  const n = i + 1;
  const { dataUrl, naturalWidth, naturalHeight } = loaded[i];
  const result = await page.evaluate(
    async ({ dataUrl, targetHeight, quality, naturalWidth, naturalHeight }) => {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = dataUrl;
      });

      // Finds the row where this panel's background scenery (buildings,
      // mountains, bridge railings, ...) gives way to the open foreground
      // ground the character walks on -- these are real painted panels,
      // not a flat drawn stripe, so "the path" has to be measured per
      // image rather than assumed at one constant height. Measured
      // against the full-resolution source (sharper signal than
      // measuring it post-downscale), before resizing.
      //
      // Samples columns across the width; for each one, walks up from
      // near the bottom looking for the single strongest vertical
      // brightness change in the lower half of the frame (comparing a
      // small window just above vs. just below each candidate row) --
      // that's the ground/scenery boundary in that column. Takes the
      // median across columns so a handful of columns landing on a rock,
      // pole or person's legs (locally noisy, but rare) doesn't skew the
      // result. Verified by eye against all 9 real panels (bridge deck,
      // stone steps, rice terraces, snowfield, tarmac, etc.) before this
      // was relied on for production output.
      function detectPathTopRow(ctx, width, height) {
        const scanTop = Math.floor(height * 0.55);
        const win = Math.max(2, Math.floor(height * 0.01));
        const sampleCols = 60;
        const edges = [];
        for (let c = 0; c < sampleCols; c++) {
          const x = Math.floor(width * (0.05 + (0.9 * c) / (sampleCols - 1)));
          const col = ctx.getImageData(x, 0, 1, height).data;
          const luma = (y) => {
            const i = y * 4;
            return 0.299 * col[i] + 0.587 * col[i + 1] + 0.114 * col[i + 2];
          };
          let bestRow = height - 1;
          let bestDelta = -1;
          for (let y = height - win - 1; y > scanTop; y--) {
            let below = 0;
            let above = 0;
            for (let w = 0; w < win; w++) {
              below += luma(y + w);
              above += luma(y - win + w);
            }
            const delta = Math.abs(below - above);
            if (delta > bestDelta) {
              bestDelta = delta;
              bestRow = y;
            }
          }
          edges.push(bestRow);
        }
        edges.sort((a, b) => a - b);
        return edges[Math.floor(edges.length / 2)];
      }

      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = naturalWidth;
      fullCanvas.height = naturalHeight;
      const fullCtx = fullCanvas.getContext("2d", { willReadFrequently: true });
      fullCtx.drawImage(img, 0, 0);
      const pathTopRow = detectPathTopRow(fullCtx, naturalWidth, naturalHeight);

      const scale = targetHeight / img.naturalHeight;
      const width = Math.round(img.naturalWidth * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false; // nearest-neighbour: keeps pixel edges crisp
      ctx.drawImage(img, 0, 0, width, targetHeight);
      return { width, height: targetHeight, webp: canvas.toDataURL("image/webp", quality), pathTopRow };
    },
    { dataUrl, targetHeight, quality, naturalWidth, naturalHeight }
  );

  // A small downward nudge off the raw detected edge: the sprite renders
  // centered on this point, so sitting exactly on the boundary row would
  // straddle it half-in-the-scenery; settling a couple percent further
  // down plants it visibly on the ground instead.
  const pathY = Math.min(0.98, result.pathTopRow / naturalHeight + 0.02);

  const file = `map-${n}.webp`;
  writeFileSync(join(outDir, file), Buffer.from(result.webp.split(",")[1], "base64"));
  manifest.push({ file, width: result.width, height: result.height, pathY: Math.round(pathY * 1000) / 1000 });
  console.log(
    `convert-map-panels: wrote ${file} (${result.width}x${result.height}, pathY ${pathY.toFixed(3)} from source row ${result.pathTopRow}/${naturalHeight})`
  );
}

await browser.close();

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`convert-map-panels: wrote ${manifestPath} (${manifest.length} panels)`);
