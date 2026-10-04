import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Jira token encryption", () => {
  it("loads its key on first use rather than module import", async () => {
    vi.stubEnv("JIRA_TOKEN_ENCRYPTION_KEY", "");
    const tokenCrypto = await import("./token-crypto");

    vi.stubEnv("JIRA_TOKEN_ENCRYPTION_KEY", "c".repeat(64));
    const ciphertext = tokenCrypto.encryptToken("oauth-token");

    expect(tokenCrypto.decryptToken(ciphertext)).toBe("oauth-token");
  });
});
