import { expect, test } from "@playwright/test";

test.describe("docs", () => {
  test("a moved page redirects permanently to its new location", async ({
    request,
  }) => {
    const response = await request.get("/docs/widget/react", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe("/docs/widget/install/react");
  });

  test("the widget overview links to every install page", async ({ page }) => {
    await page.goto("/docs/widget/overview");

    await page.getByRole("link", { name: /^Script embed/ }).click();

    await expect(page).toHaveURL("/docs/widget/install/script-embed");
    await expect(
      page.getByRole("heading", { level: 1, name: "Script Embed" }),
    ).toBeVisible();
  });
});
