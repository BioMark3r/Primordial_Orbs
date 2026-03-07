import { expect, test, type Page } from "@playwright/test";
import { intersects, rectOf } from "./helpers/layout";

const viewports = [
  { name: "desktop", width: 1365, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 375, height: 667 },
] as const;

async function gotoStableDemo(page: Page) {
  await page.goto("/?demo=1&shots=1", { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
  await expect(page.getByTestId("screen-game")).toBeVisible();
}

for (const viewport of viewports) {
  test.describe(`UI layout guardrails ${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

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

    test("main regions keep sensible order", async ({ page }) => {
      await gotoStableDemo(page);

      const status = page.getByTestId("core-status");
      const board = page.getByTestId("region-main-board");
      const supporting = page.getByTestId("region-supporting");

      await expect(status).toBeVisible();
      await expect(board).toBeVisible();
      await expect(supporting).toBeVisible();

      const [statusRect, boardRect, supportingRect] = await Promise.all([
        rectOf(status),
        rectOf(board),
        rectOf(supporting),
      ]);

      expect(boardRect.y).toBeGreaterThanOrEqual(statusRect.y - 1);
      expect(supportingRect.y).toBeGreaterThanOrEqual(boardRect.y - 1);

      if (viewport.name === "mobile" || viewport.name === "small-mobile") {
        await page.getByRole("button", { name: "History" }).click();
        const historyPanel = page.getByTestId("turn-history-panel");
        await expect(historyPanel).toBeVisible();
        const historyRect = await rectOf(historyPanel);
        expect(historyRect.y).toBeGreaterThanOrEqual(supportingRect.y - 1);
      }
    });



    test("mobile secondary sections are toggleable", async ({ page }) => {
      await gotoStableDemo(page);

      if (viewport.name !== "mobile" && viewport.name !== "small-mobile") {
        test.skip();
      }

      const secondaryPanel = page.getByTestId("mobile-secondary-panel");
      await expect(secondaryPanel).toBeVisible();

      await page.getByRole("button", { name: "Piles" }).click();
      await expect(page.getByTestId("mobile-piles-panel")).toBeVisible();

      await page.getByRole("button", { name: "Players" }).click();
      await expect(page.getByTestId("mobile-players-panel")).toBeVisible();

      await page.getByRole("button", { name: "Inspect" }).click();
      await expect(page.getByTestId("mobile-inspect-panel")).toBeVisible();
    });

    test("impact inspect works without hover on mobile", async ({ page }) => {
      await gotoStableDemo(page);

      if (viewport.name !== "mobile" && viewport.name !== "small-mobile") {
        test.skip();
      }

      await page.getByRole("button", { name: "Inspect" }).click();
      const inspectPanel = page.getByTestId("mobile-inspect-panel");
      await expect(inspectPanel).toBeVisible();

      const impactHint = page.locator('[data-testid="hand-panel"] .hand-token .hand-impact-hint').first();
      await expect(impactHint).toBeVisible();
      await impactHint.locator('xpath=..').click();
      await expect(inspectPanel.getByText("Impact Preview")).toBeVisible();
    });

    test("layout screenshots", async ({ page }) => {
      await gotoStableDemo(page);

      await expect(page.getByTestId("topbar")).toHaveScreenshot(`topbar-${viewport.name}.png`);
      await expect(page.getByTestId("player-panel-0")).toHaveScreenshot(`player-panel-0-${viewport.name}.png`);
      await expect(page.getByTestId("player-panel-1")).toHaveScreenshot(`player-panel-1-${viewport.name}.png`);
      await expect(page.getByTestId("screen-game")).toHaveScreenshot(`screen-game-${viewport.name}.png`);
    });

    test("renders element sprite assets (no generic orb sprite)", async ({ page }) => {
      await gotoStableDemo(page);

      const firstOrbSprite = page.locator(".orb__sprite").first();
      await expect(firstOrbSprite).toBeVisible();
      const src = await firstOrbSprite.getAttribute("src");
      expect(src ?? "", `Unexpected orb sprite src: ${src}`).toMatch(/orb_(lava|ice|nature|void)\.(webp|png)/);
      expect(src ?? "").not.toContain("generic");
    });
  });
}
