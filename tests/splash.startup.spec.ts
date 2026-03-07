import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1365, height: 768 },
  { name: "mobile", width: 390, height: 844 },
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
  });
}
