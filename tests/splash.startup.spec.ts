import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1365, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 375, height: 667 },
] as const;

for (const viewport of viewports) {
  test.describe(`splash startup flow ${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("shows splash first and continues into setup + game", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      await expect(page.getByTestId("screen-splash")).toBeVisible();
      await expect(page.getByRole("button", { name: "Continue as Guest" })).toBeVisible();

      await page.getByRole("button", { name: "Continue as Guest" }).click();
      await expect(page.getByTestId("screen-setup")).toBeVisible();
      await expect(page.getByText("Match Lobby")).toBeVisible();
      await expect(page.getByTestId("setup-mode-hotseat")).toBeVisible();
      await expect(page.getByTestId("setup-mode-cpu")).toBeVisible();

      await page.getByTestId("start-game").click();
      await expect(page.getByTestId("screen-game")).toBeVisible();
    });

    test("setup screen remains scrollable and start game is reachable on mobile", async ({ page }) => {
      if (viewport.name !== "mobile" && viewport.name !== "small-mobile") {
        test.skip();
      }

      await page.goto("/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Continue as Guest" }).click();
      const setupScreen = page.getByTestId("screen-setup");
      const startButton = page.getByTestId("start-game");
      await expect(setupScreen).toBeVisible();

      const overflowState = await page.evaluate(() => ({
        hasVerticalOverflow: document.documentElement.scrollHeight > window.innerHeight,
        hasHorizontalOverflow:
          document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth,
      }));
      expect(overflowState.hasHorizontalOverflow).toBe(false);

      await startButton.scrollIntoViewIfNeeded();
      await expect(startButton).toBeVisible();
      await expect(startButton).toBeInViewport();

      if (overflowState.hasVerticalOverflow) {
        const scrollTopAfter = await page.evaluate(() => {
          const root = document.scrollingElement ?? document.documentElement;
          const baseline = root.scrollTop;
          root.scrollTop = baseline + 220;
          return root.scrollTop;
        });
        expect(scrollTopAfter).toBeGreaterThan(0);
      }
    });

    test("advanced options expand and collapse from setup", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Continue as Guest" }).click();

      const advanced = page.getByTestId("setup-advanced");
      await expect(advanced).toBeVisible();
      await expect(page.getByText("Copy Setup Link")).toHaveCount(0);

      await advanced.locator("summary").click();
      await expect(page.getByRole("button", { name: "Copy Setup Link" })).toBeVisible();

      await advanced.locator("summary").click();
      await expect(page.getByRole("button", { name: "Copy Setup Link" })).toHaveCount(0);
    });

    test("cpu setup cards are readable and interactable", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Continue as Guest" }).click();

      await page.getByTestId("setup-mode-cpu").click();
      await expect(page.getByTestId("setup-difficulty-normal")).toBeVisible();
      await page.getByTestId("setup-difficulty-hard").click();

      await page.getByTestId("start-game").click();
      await expect(page.getByTestId("screen-game")).toBeVisible();
    });

    test("mobile gameplay layout stays in-bounds after splash", async ({ page }) => {
      if (viewport.name !== "mobile" && viewport.name !== "small-mobile") {
        test.skip();
      }

      await page.goto("/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Continue as Guest" }).click();
      await expect(page.getByTestId("screen-setup")).toBeVisible();
      await page.getByTestId("start-game").click();

      const gameScreen = page.getByTestId("screen-game");
      const board = page.getByTestId("region-main-board");
      const supporting = page.getByTestId("region-supporting");
      const toolbar = page.getByTestId("mobile-toolbar");
      const handPanel = page.getByTestId("hand-panel");
      const arena = page.getByTestId("arena");

      await expect(gameScreen).toBeVisible();
      await expect(toolbar).toBeVisible();
      await expect(board).toBeVisible();
      await expect(supporting).toBeVisible();
      await expect(handPanel).toBeVisible();
      await expect(arena).toBeVisible();

      const overflow = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        body: document.body.scrollWidth <= document.body.clientWidth,
      }));
      expect(overflow.doc && overflow.body).toBe(true);

      const mobilePanelCount = await page.locator('[data-testid="player-panel-0"], [data-testid="player-panel-1"]').count();
      expect(mobilePanelCount).toBe(1);

      const [boardBox, supportingBox] = await Promise.all([board.boundingBox(), supporting.boundingBox()]);
      expect(boardBox).not.toBeNull();
      expect(supportingBox).not.toBeNull();
      expect((supportingBox?.y ?? 0)).toBeGreaterThanOrEqual((boardBox?.y ?? 0) - 1);
    });
  });
}
