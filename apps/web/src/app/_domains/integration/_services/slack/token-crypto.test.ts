import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Slack token encryption", () => {
  it("loads its key on first use rather than module import", async () => {
    vi.stubEnv("SLACK_TOKEN_ENCRYPTION_KEY", "");
    const tokenCrypto = await import("./token-crypto");

    vi.stubEnv("SLACK_TOKEN_ENCRYPTION_KEY", "b".repeat(64));
    const ciphertext = tokenCrypto.encryptSlackToken("oauth-token");

    expect(tokenCrypto.decryptSlackToken(ciphertext)).toBe("oauth-token");
  });
});
