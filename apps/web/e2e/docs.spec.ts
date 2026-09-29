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

  test("the useFeedback hook page redirects permanently to Control the Widget", async ({
    request,
  }) => {
    const response = await request.get("/docs/widget/use-feedback-hook", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe(
      "/docs/widget/control-the-widget",
    );
  });

  test("the Other frameworks page redirects permanently into the Install folder", async ({
    request,
  }) => {
    const response = await request.get("/docs/widget/other-frameworks", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe(
      "/docs/widget/install/other-frameworks",
    );
  });

  test("the widget overview links to every install page", async ({ page }) => {
    await page.goto("/docs/widget/overview");

    // The sidebar links to the same pages, so target the card in the page body.
    await page
      .getByRole("article")
      .getByRole("link", { name: /^Script embed/ })
      .click();

    // The dev server compiles the install page on its first request.
    await expect(page).toHaveURL("/docs/widget/install/script-embed", {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Script Embed" }),
    ).toBeVisible();
  });

  test("the widget overview links to the Vue install page", async ({
    page,
  }) => {
    await page.goto("/docs/widget/overview");

    await page.getByRole("article").getByRole("link", { name: /^Vue/ }).click();

    await expect(page).toHaveURL("/docs/widget/install/vue", {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Vue" }),
    ).toBeVisible();
  });
});
