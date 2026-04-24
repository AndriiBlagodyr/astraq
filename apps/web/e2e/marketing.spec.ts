import { expect, test } from "@playwright/test";

test("marketing page links into the stock workspace", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /Research markets through one calm, readable workspace/i,
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Explore Stocks" }).click();

  await expect(
    page.getByRole("heading", {
      name: /Every stock gets one workspace and multiple ways to explore the same data/i,
    }),
  ).toBeVisible();
});
