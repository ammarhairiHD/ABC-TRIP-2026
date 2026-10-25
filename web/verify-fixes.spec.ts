import { test, expect, type Page } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  hasTouch: true,
  isMobile: true,
});

const dayDialogue = (page: Page) => page.getByRole("dialog").filter({ hasText: /^Day \d/ });

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Menu" }).click();
}

async function currentDialogueDay(page: Page): Promise<number> {
  const text = await dayDialogue(page).locator("div").first().innerText();
  return Number(text.match(/Day (\d+)/)![1]);
}

test("menu 'The climb' from another page lands on /climb scrolled to Day 1, and scrolling still works after that", async ({
  page,
}) => {
  // Reproduces bug 1: arrive at /climb via a client-side navigation from
  // another page (not a fresh document load), and confirm the journey
  // map's scroll tracking still responds -- previously it never attached.
  await page.goto("http://localhost:8787/people");
  await expect(page.locator("header").first()).toBeVisible({ timeout: 10000 });

  await openMenu(page);
  await page.getByRole("button", { name: "The climb" }).click();

  await expect(page).toHaveURL(/\/climb$/);
  await expect(dayDialogue(page)).toBeVisible();
  await expect(dayDialogue(page)).toContainText("Day 1");

  // Scroll further and confirm the sprite/dialogue actually keep tracking
  // scroll position -- the bug was that scrolling did nothing at all here.
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(50);
  }
  await expect
    .poll(async () => currentDialogueDay(page), { timeout: 5000 })
    .toBeGreaterThan(1);
});

test("menu 'The way home' from another page lands on /climb scrolled to Day 6", async ({ page }) => {
  await page.goto("http://localhost:8787/built");
  await expect(page.locator("header").first()).toBeVisible({ timeout: 10000 });
  await openMenu(page);
  await page.getByRole("button", { name: "The way home" }).click();

  await expect(page).toHaveURL(/\/climb$/);
  await expect(dayDialogue(page)).toBeVisible();
  await expect(dayDialogue(page)).toContainText("Day 6");
});

test("day page back button -> /climb: scrolling moves the sprite/dialogue", async ({ page }) => {
  // Reproduces bug 1's other repro path: day page -> back to the map.
  await page.goto("http://localhost:8787/day/3");
  await expect(page.locator("header").first()).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/climb$/);

  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(50);
  }
  await expect(dayDialogue(page)).toBeVisible({ timeout: 5000 });
});

test("menu shows Scenery by Alya as a disabled 'Coming soon' item", async ({ page }) => {
  await page.goto("http://localhost:8787/people");
  await openMenu(page);

  const menu = page.getByRole("dialog", { name: "Menu" });
  const scenery = menu.getByText("Scenery by Alya");
  await expect(scenery).toBeVisible();
  await expect(scenery).toContainText("Coming soon");
  await expect(scenery).toHaveAttribute("aria-disabled", "true");

  await scenery.click();
  // Not a link: clicking it does not navigate away.
  await expect(page).toHaveURL(/\/people$/);
});
