import { expect, test } from "@playwright/test";

test("marketing page links into the stock workspace", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /Astraq is a full-stack and ML learning lab/i,
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open Stock Routes" }).click();

  await expect(
    page.getByRole("heading", {
      name: /Every stock gets one workspace and multiple ways to explore the same data/i,
    }),
  ).toBeVisible();
});
