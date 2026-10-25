import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  hasTouch: true,
  isMobile: true,
});

test("first app load shows the pixel loader under slow 3G, then the real content", async ({ page, context }) => {
  // Slow-3G-ish: every request (JS bundle, fonts, CSS, API, sprite) pays a
  // fixed latency tax, so the pre-React static loader stays up long enough
  // to actually capture, the same way it would on a real slow connection.
  await context.route("**/*", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });

  await page.goto("http://localhost:8787/", { waitUntil: "commit" });

  const loader = page.locator("#initial-loader");
  await expect(loader).toBeVisible();
  await page.screenshot({ path: "screenshots/app-start-loader.png" });

  await expect(page.getByText("ABC Trip 2026")).toBeVisible({ timeout: 20000 });
  await expect(loader).toHaveCount(0);
});

test("boot screen holds for at least ~2s on a fast load, and only the first time this session", async ({
  page,
}) => {
  const start = Date.now();
  await page.goto("http://localhost:8787/", { waitUntil: "commit" });

  const loader = page.locator("#initial-loader");
  await expect(loader).toBeVisible();

  // Real data/JS are fast against a local dev server, so if the boot screen
  // weren't being held open deliberately it would vanish almost at once.
  await page.waitForTimeout(1500);
  await expect(loader).toBeVisible();
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(1500);

  await expect(loader).toHaveCount(0, { timeout: 2000 });

  // Same tab/session: a second load skips the long boot screen -- it's
  // hidden via CSS before paint, then removed almost immediately, never
  // held open for ~2s again.
  const start2 = Date.now();
  await page.goto("http://localhost:8787/", { waitUntil: "commit" });
  await expect(page.locator("#initial-loader")).toHaveCount(0, { timeout: 1000 });
  const elapsed2 = Date.now() - start2;
  expect(elapsed2).toBeLessThan(1500);
});

test("/day/3 shows the level-transition card (DAY n + altitude + tip) while its data is loading", async ({
  page,
  context,
}) => {
  // Consume the once-per-session boot screen first (see the test above) --
  // otherwise, on a true first-ever load, the boot screen's higher z-index
  // sits on top of the level-transition card and the screenshot below would
  // capture the boot screen instead of what this test is actually checking.
  await page.goto("http://localhost:8787/");
  await expect(page.locator("#initial-loader")).toHaveCount(0, { timeout: 5000 });

  // A short, sub-1s delay: data (including the altitude) has time to arrive
  // before the card's forced ~1s minimum is up, so the screenshot below
  // captures the full card -- DAY n, altitude and tip -- not a half-loaded
  // version of it, while still proving the card covers a real loading gap.
  await context.route("**/api/**", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  await context.route("**/i18n/**", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });

  await page.goto("http://localhost:8787/day/3");

  const transition = page.getByRole("status").filter({ hasText: "Day 3" });
  await expect(transition).toBeVisible();
  await expect(transition).toContainText("TIP:");
  await expect(transition).toContainText("m", { timeout: 2000 }); // altitude, e.g. "2,170 m"
  await page.screenshot({ path: "screenshots/day-3-level-transition.png" });

  await expect(transition).toHaveCount(0, { timeout: 20000 });
});

test("a fast /day/3 load still holds the ~1s level-transition card instead of skipping it", async ({ page }) => {
  // No throttling: the data is ready almost immediately against a local dev
  // server, but entering a day page always plays this beat regardless of
  // load speed -- unlike the generic 300ms-rule loader elsewhere.
  const start = Date.now();
  await page.goto("http://localhost:8787/day/3");

  const transition = page.getByRole("status").filter({ hasText: "Day 3" });
  await expect(transition).toBeVisible();
  await expect(transition).toHaveCount(0, { timeout: 5000 });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(900);

  await expect(page.locator("header").first()).toBeVisible({ timeout: 5000 });
});

test("a fast /people load shows no loader at all", async ({ page }) => {
  // No throttling here: the 300ms show-delay should mean the loader never
  // mounts for a load this fast against a local dev server. People uses the
  // generic 300ms-rule loader, not a level transition, so it should be
  // skippable entirely on a fast load (unlike day pages).
  await page.goto("http://localhost:8787/people");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator("header").first()).toBeVisible({ timeout: 5000 });
});
