import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  hasTouch: true,
  isMobile: true,
});

// The moment-card row used to live on the day page; moments now live on the
// /climb path itself (see verify-restructure.spec.ts), so this file only
// covers the standalone moment detail page (/moments/:id) reached from there
// or from a shared link.

test("video-hero moment page shows story, grid, and In this moment row; back goes to its gallery day", async ({ page }) => {
  await page.goto("http://localhost:8787/moments/uno-with-simran");
  await expect(page.locator("header").first()).toBeVisible({ timeout: 10000 });

  // Title from i18n/en/moments.json (hand-written in moments.json; title/story
  // pairing happens to be swapped in the source data for this id -- a content
  // issue in abc-face-tools, not this feature). Layout's site-wide TopBar
  // also renders a <header>, so scope to MomentPage's own (the second one).
  await expect(page.locator("h1")).toHaveText("Trust the Driver");
  const pageHeader = page.locator("header").nth(1);
  await expect(pageHeader).toContainText("Funny");

  const inThisMoment = page.getByRole("heading", { name: "In this moment" });
  await expect(inThisMoment).toBeVisible();
  const peopleRow = page.getByLabel("In this moment", { exact: true });
  await expect(peopleRow.locator("button").first()).toBeVisible();

  // Grid: open the lightbox on the first tile and confirm it opens.
  const grid = page.locator('[class*="grid-cols-3"]');
  await expect(grid).toBeVisible();
  await grid.locator("button").first().click();
  await expect(page.locator(".yarl__container")).toBeVisible({ timeout: 5000 });
  await page.keyboard.press("Escape");

  await page.screenshot({ path: "test-results/moment-uno-with-simran.png", fullPage: true });

  // Back goes to that day's gallery (day 3), not browser history.
  await pageHeader.locator("button").first().click();
  await expect(page).toHaveURL(/\/gallery\/3$/);
  await expect(page.locator("header").nth(1)).toContainText("Day 3");
});
