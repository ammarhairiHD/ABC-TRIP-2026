import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

// Indices into the 37-moment trail order (moment-points.json), picked
// against the real map-panels.json geometry (all 9 panels now share one
// 2752x1536 source aspect, so each renders 968px wide at the shared 540px
// height, overlapping its neighbour by 43px):
//   panel 1 (Kathmandu temples): x 0.000-0.116 -- index 0 (x=0.014) sits
//     well inside it, and is where the walk starts anyway (0 clicks).
//   panel 8 (ABC peaks): x 0.774-0.889 -- index 30 (x=0.824) sits near its
//     center.
//   panel 1/2 seam (crossfade zone x 0.111-0.116) -- index 4 (x=0.122) is
//     the closest trail point to that zone's center.
const PANEL_1_INDEX = 0;
const SEAM_INDEX = 4;
const PANEL_8_INDEX = 30;

async function clickNext(page: Page, times: number) {
  const next = page.getByRole("button", { name: "Next moment" });
  for (let i = 0; i < times; i++) {
    await next.click();
    await page.waitForTimeout(650); // WALK_DURATION_S (0.6s) pan/step animation
  }
}

test("real map art: panel 1 (Kathmandu), the panel 1/2 seam, and panel 8 (ABC)", async ({ page }) => {
  await page.goto("http://localhost:8787/climb");
  await expect(page.locator("#initial-loader")).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator('img[src="/map/map-1.webp"]')).toBeVisible({ timeout: 10000 });

  // Panel 1: Kathmandu temples (no clicks needed, the walk starts here).
  await page.screenshot({ path: "test-results/real-art-panel-1-kathmandu.png" });

  // The panel 1/2 seam.
  await clickNext(page, SEAM_INDEX - PANEL_1_INDEX);
  await page.screenshot({ path: "test-results/real-art-seam-1-2.png" });
  await expect(page.locator('img[src="/map/map-1.webp"]')).toBeAttached();
  await expect(page.locator('img[src="/map/map-2.webp"]')).toBeAttached();

  // Panel 8: ABC peaks / prayer-flag village.
  await clickNext(page, PANEL_8_INDEX - SEAM_INDEX);
  await page.screenshot({ path: "test-results/real-art-panel-8-abc.png" });
  await expect(page.locator('img[src="/map/map-8.webp"]')).toBeAttached();
});
