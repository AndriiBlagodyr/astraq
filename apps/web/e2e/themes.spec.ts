import { expect, test } from "@playwright/test";

test.describe("design system themes", () => {
  test("switches color mode and brand theme independently", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("astraq-color-mode", "dark");
      localStorage.setItem("astraq-theme", "astraq");
    });
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "astraq");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");

    await page
      .getByRole("button", {
        name: /Current theme: astraq\. Switch to terminal/,
      })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "terminal"
    );

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "terminal"
    );
  });

  test("keeps the marketing shell usable on a mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Switch to (light|dark) mode/ })
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
