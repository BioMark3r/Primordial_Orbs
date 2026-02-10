import { expect, test, type Page } from "@playwright/test";
import { intersects, rectOf } from "./helpers/layout";

const viewports = [
  { width: 1365, height: 768 },
  { width: 1200, height: 768 },
] as const;

async function gotoStableDemo(page: Page) {
  await page.goto("/?demo=1&shots=1", { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
  await expect(page.getByTestId("screen-game")).toBeVisible();
}

for (const viewport of viewports) {
  test.describe(`UI layout guardrails ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("no horizontal page scroll", async ({ page }) => {
      await gotoStableDemo(page);

      const overflow = await page.evaluate(() => ({
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        noOverflow:
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      }));

      expect(
        overflow.noOverflow,
        `Horizontal overflow detected: document ${overflow.documentScrollWidth}/${overflow.documentClientWidth}, body ${overflow.bodyScrollWidth}/${overflow.bodyClientWidth}`,
      ).toBe(true);
    });

    test("undo and stats do not overlap and stats stay in panel", async ({ page }) => {
      await gotoStableDemo(page);

      const panel = page.getByTestId("player-panel-0");
      const undo = page.getByTestId("btn-undo");
      const stats = page.getByTestId("panel-stats-right-0");

      await expect(panel).toBeVisible();
      await expect(undo).toBeVisible();
      await expect(stats).toBeVisible();

      const [panelRect, undoRect, statsRect] = await Promise.all([rectOf(panel), rectOf(undo), rectOf(stats)]);

      expect(intersects(statsRect, undoRect), "Stats text overlaps Undo button").toBe(false);
      expect(
        statsRect.x + statsRect.width,
        `Stats container overflows panel bounds: stats right=${statsRect.x + statsRect.width}, panel right=${panelRect.x + panelRect.width}`,
      ).toBeLessThanOrEqual(panelRect.x + panelRect.width + 1);
    });

    test("layout screenshots", async ({ page }) => {
      await gotoStableDemo(page);

      await expect(page.getByTestId("topbar")).toHaveScreenshot(`topbar-${viewport.width}.png`);
      await expect(page.getByTestId("player-panel-0")).toHaveScreenshot(`player-panel-0-${viewport.width}.png`);
      await expect(page.getByTestId("player-panel-1")).toHaveScreenshot(`player-panel-1-${viewport.width}.png`);
      await expect(page.getByTestId("screen-game")).toHaveScreenshot(`screen-game-${viewport.width}.png`);
    });
  });
}
