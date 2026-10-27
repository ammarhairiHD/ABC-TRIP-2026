#!/usr/bin/env node
/**
 * Converts the 4 raw /climb map panels into the crisp, consistent-height
 * PNGs the site actually serves.
 *
 * Unlike abc-face-tools/sprite_fix.py (which removes a chroma-key
 * background and crops individual sprite frames out of an AI-generated
 * sheet), a map panel is already one full background image with nothing to
 * crop out -- this just needs a nearest-neighbour resize to one shared
 * height so all 4 panels line up edge to edge, with pixel edges kept sharp.
 *
 * Usage (from web/):
 *   node scripts/convert-map-panels.mjs [--height 540]
 *
 * Reads  ../sprites-raw/map-1.png .. map-4.png  (gitignored staging dir,
 *        same convention as the character sprites -- drop your 4 raw
 *        panels there first)
 * Writes public/map/map-1.png .. map-4.png
 *
 * If the output aspect ratio ends up different from the placeholder's 4:3,
 * update PANEL_ASPECT in src/lib/mapLayout.ts to match what this prints.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const rawDir = join(webRoot, "..", "sprites-raw");
const outDir = join(webRoot, "public", "map");
const PANEL_COUNT = 4;

const heightArgIndex = process.argv.indexOf("--height");
const targetHeight = heightArgIndex >= 0 ? Number(process.argv[heightArgIndex + 1]) : 540;
if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
  console.error("convert-map-panels: --height must be a positive number");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

for (let i = 1; i <= PANEL_COUNT; i++) {
  const srcPath = join(rawDir, `map-${i}.png`);
  if (!existsSync(srcPath)) {
    console.error(`convert-map-panels: missing ${srcPath} -- drop your 4 raw panels in sprites-raw/ first`);
    process.exit(1);
  }

  const dataUrl = `data:image/png;base64,${readFileSync(srcPath).toString("base64")}`;
  const result = await page.evaluate(
    async ({ dataUrl, targetHeight }) => {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = dataUrl;
      });
      const scale = targetHeight / img.naturalHeight;
      const width = Math.round(img.naturalWidth * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false; // nearest-neighbour: keeps pixel edges crisp
      ctx.drawImage(img, 0, 0, width, targetHeight);
      return { width, height: targetHeight, png: canvas.toDataURL("image/png") };
    },
    { dataUrl, targetHeight }
  );

  const outPath = join(outDir, `map-${i}.png`);
  writeFileSync(outPath, Buffer.from(result.png.split(",")[1], "base64"));
  console.log(`convert-map-panels: wrote ${outPath} (${result.width}x${result.height}, aspect ${(result.width / result.height).toFixed(3)})`);
}

await browser.close();
