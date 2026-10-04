import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GitHub App configuration", () => {
  it("can be imported when the optional integration is not configured", async () => {
    vi.stubEnv("GITHUB_APP_ID", "");
    vi.stubEnv("GITHUB_PRIVATE_KEY", "");

    await expect(import("./github-app")).resolves.toHaveProperty(
      "getAppOctokit",
    );
  });

  it("requires the private key only when creating an app client", async () => {
    vi.stubEnv("GITHUB_APP_ID", "test-app-id");
    vi.stubEnv("GITHUB_PRIVATE_KEY", "");
    const { getAppOctokit } = await import("./github-app");

    expect(() => getAppOctokit()).toThrow(
      "Missing environment variable: GITHUB_PRIVATE_KEY",
    );
  });
});
