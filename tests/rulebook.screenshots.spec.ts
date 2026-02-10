import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join("public", "rulebook");

test("capture rulebook screenshots", async ({ page }) => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.addStyleTag({
    content:
      "*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }",
  });

  await expect(page.getByTestId("screen-splash")).toBeVisible();
  await page.screenshot({ path: path.join(OUTPUT_DIR, "00_splash.png") });

  await page.getByRole("button", { name: "Enter the Cataclysm Arena" }).click();
  await expect(page.getByTestId("screen-setup")).toBeVisible();
  await page.screenshot({ path: path.join(OUTPUT_DIR, "01_setup.png") });

  await page.getByPlaceholder("e.g. 12345").fill("424242");
  await page.getByTestId("start-game").click();

  await expect(page.getByTestId("screen-game")).toBeVisible();
  await expect(page.getByTestId("topbar")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.screenshot({ path: path.join(OUTPUT_DIR, "02_game_overview.png") });
  await page.getByTestId("hand-panel").screenshot({ path: path.join(OUTPUT_DIR, "03_hand_panel.png") });
  await page.getByTestId("arena").screenshot({ path: path.join(OUTPUT_DIR, "04_arena_fx.png") });
  await page.getByTestId("core-status").screenshot({ path: path.join(OUTPUT_DIR, "05_core_status.png") });

  await page.getByTestId("hand-panel").locator("button[title^='Impact:']").first().click();
  await expect(page.getByTestId("impact-preview")).toBeVisible();
  await page.getByTestId("impact-preview").screenshot({ path: path.join(OUTPUT_DIR, "06_impact_preview.png") });

  await page.locator("[data-testid='progress-track-p0'], [data-testid='progress-track-p1']").first().scrollIntoViewIfNeeded();
  await page
    .locator("[data-testid='progress-track-p0'], [data-testid='progress-track-p1']")
    .screenshot({ path: path.join(OUTPUT_DIR, "07_progress_track.png") });

  await page.getByTestId("menu-game").click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.screenshot({ path: path.join(OUTPUT_DIR, "08_replay_tools.png") });
  await page.keyboard.press("Escape");

  await page.getByTestId("menu-help").click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.screenshot({ path: path.join(OUTPUT_DIR, "09_help_menu.png") });
});
