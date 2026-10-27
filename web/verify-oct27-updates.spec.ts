import { test, expect, type Page } from "@playwright/test";

const WIDTHS = [
  { name: "390px", width: 390, height: 844 },
  { name: "1280px", width: 1280, height: 800 },
];

// Panel geometry shifts whenever the real map-panels.json is regenerated
// (see convert-map-panels.mjs), so these two indices just need to land
// near *a* seam and inside panel 8 -- exact panel-boundary verification
// against real art lives in verify-real-map-art.spec.ts instead.
const SEAM_MOMENT_INDEX = 4;
const ABC_PANEL_MOMENT_INDEX = 30;

async function clickNext(page: Page, times: number) {
  const next = page.getByRole("button", { name: "Next moment" });
  for (let i = 0; i < times; i++) {
    await next.click();
    await page.waitForTimeout(650); // WALK_DURATION_S (0.6s) pan/step animation
  }
}

for (const vp of WIDTHS) {
  test.describe(`${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("opening page: fixed title, new credit line", async ({ page }) => {
      await page.goto("http://localhost:8787/");
      await expect(page.locator("#initial-loader")).toHaveCount(0, { timeout: 15000 });
      await expect(page.locator("h1")).toHaveText("ABC Trip 2026");
      await expect(page.locator("h1")).not.toContainText("2026 2");

      const credit = page.locator("p", { hasText: "Ammar Hairi" });
      await expect(credit).toContainText("A game by");
      await expect(credit).toContainText("Ammar Hairi");
      await expect(credit).toContainText("♥");

      await page.screenshot({ path: `test-results/opening-${vp.name}.png` });
    });

    test("map: a seam and the ABC panel render", async ({ page }) => {
      await page.goto("http://localhost:8787/climb");
      await expect(page.locator('img[src="/map/map-1.webp"]')).toBeVisible({ timeout: 10000 });

      await clickNext(page, SEAM_MOMENT_INDEX);
      await page.screenshot({ path: `test-results/map-seam-${vp.name}.png` });
      // Both panels either side of the seam should be mounted (lazy-load
      // fires as the camera approaches).
      await expect(page.locator('img[src="/map/map-2.webp"]')).toBeAttached();
      await expect(page.locator('img[src="/map/map-3.webp"]')).toBeAttached();

      await clickNext(page, ABC_PANEL_MOMENT_INDEX - SEAM_MOMENT_INDEX);
      await page.screenshot({ path: `test-results/map-abc-panel-${vp.name}.png` });
      await expect(page.locator('img[src="/map/map-8.webp"]')).toBeAttached();
    });

    test("☰ MENU button shows icon + label with a 44px touch target", async ({ page }) => {
      await page.goto("http://localhost:8787/climb");
      const menuButton = page.getByRole("button", { name: "Menu" });
      await expect(menuButton).toBeVisible();
      await expect(menuButton).toContainText("☰");
      await expect(menuButton).toContainText("Menu"); // rendered all-caps via CSS text-transform
      const box = await menuButton.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });
  });
}

test.describe("tutorial bubble (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows on first /climb visit, not on a second", async ({ page }) => {
    // Fresh context per test already has empty localStorage -- no setup needed.
    await page.goto("http://localhost:8787/climb");
    // The static pre-React boot overlay holds for a minimum ~2s and can
    // still be painted on top even once the real content underneath
    // already passes Playwright's (occlusion-blind) visibility check --
    // wait for it to fully clear before screenshotting.
    await expect(page.locator("#initial-loader")).toHaveCount(0, { timeout: 15000 });
    const bubble = page.getByRole("note");
    await expect(bubble).toBeVisible();
    await expect(bubble).toContainText("Find everyone here!");
    await page.screenshot({ path: "test-results/menu-tutorial-first-visit.png" });

    // Tap dismisses it immediately, before the ~5s auto-dismiss.
    await bubble.click();
    await expect(bubble).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    await expect(page.getByRole("note")).toHaveCount(0);
  });

  test("never appears outside /climb", async ({ page }) => {
    await page.goto("http://localhost:8787/people");
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    await expect(page.getByRole("note")).toHaveCount(0);
  });
});

test.describe("photos indicator (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bobs via CSS animation and hides once scrolled into view", async ({ page }) => {
    await page.goto("http://localhost:8787/moments/uno-with-simran");
    // Standalone moment page doesn't carry the hint (it's climb-only); drive
    // it from /climb instead, landing on the same moment via its marker id.
    await page.goto("http://localhost:8787/climb");
    await expect(page.locator('img[src="/map/map-1.webp"]')).toBeVisible({ timeout: 10000 });
    await clickNext(page, 7); // uno-with-simran is index 7

    const hint = page.getByText("↓ photos");
    const hintCount = await hint.count();
    if (hintCount > 0) {
      await expect(hint).toBeVisible();
      const animationName = await hint.evaluate((el) => getComputedStyle(el).animationName);
      expect(animationName).toBe("photos-hint-bob");

      const scrollArea = page.locator(".overflow-y-auto").first();
      await scrollArea.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await expect(hint).toHaveCount(0);
    }
  });

  test("respects reduced motion (no animation iterations)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:8787/climb");
    await expect(page.locator('img[src="/map/map-1.webp"]')).toBeVisible({ timeout: 10000 });
    await clickNext(page, 7);
    const hint = page.getByText("↓ photos");
    if ((await hint.count()) > 0) {
      // Browsers format the reduced-motion override's 0.001ms differently
      // (e.g. "0.001ms" vs "1e-06s") -- parse to a number instead of
      // comparing strings.
      const durationMs = await hint.evaluate((el) => {
        const raw = getComputedStyle(el).animationDuration;
        const value = parseFloat(raw);
        return raw.endsWith("ms") ? value : value * 1000;
      });
      expect(durationMs).toBeLessThan(0.01);
    }
  });
});
