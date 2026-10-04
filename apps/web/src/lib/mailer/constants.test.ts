import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("mail sender addresses", () => {
  it("uses the configured mail domain instead of the app domain", async () => {
    vi.stubEnv("DOMAIN_NAME", "muzza-feedback.vercel.app");
    vi.stubEnv("MAIL_FROM_DOMAIN", "mail.example.com");
    vi.resetModules();

    const { SENDER_EMAIL, NO_REPLY_EMAIL } = await import("./constants");

    expect(SENDER_EMAIL).toBe("contact@mail.example.com");
    expect(NO_REPLY_EMAIL).toBe("noreply@mail.example.com");
  });

  it.each(["", "   "])(
    "uses the app domain when the mail domain is blank (%j)",
    async (mailDomain) => {
      vi.stubEnv("DOMAIN_NAME", "muzza-feedback.vercel.app");
      vi.stubEnv("MAIL_FROM_DOMAIN", mailDomain);
      vi.resetModules();

      const { SENDER_EMAIL, NO_REPLY_EMAIL } = await import("./constants");

      expect(SENDER_EMAIL).toBe("contact@muzza-feedback.vercel.app");
      expect(NO_REPLY_EMAIL).toBe("noreply@muzza-feedback.vercel.app");
    },
  );
});
