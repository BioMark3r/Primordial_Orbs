import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1365, height: 768 },
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

      await expect(gameScreen).toBeVisible();
      await expect(toolbar).toBeVisible();
      await expect(board).toBeVisible();
      await expect(supporting).toBeVisible();
      await expect(handPanel).toBeVisible();

      const overflow = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        body: document.body.scrollWidth <= document.body.clientWidth,
      }));
      expect(overflow.doc && overflow.body).toBe(true);

      const [boardBox, supportingBox] = await Promise.all([board.boundingBox(), supporting.boundingBox()]);
      expect(boardBox).not.toBeNull();
      expect(supportingBox).not.toBeNull();
      expect((supportingBox?.y ?? 0)).toBeGreaterThanOrEqual((boardBox?.y ?? 0) - 1);
    });
  });
}
