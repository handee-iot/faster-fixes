import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Stripe auth plugin", () => {
  it("omits the billing plugin in a self-hosted production build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_IS_CLOUD", "false");
    vi.stubEnv("STRIPE_WEBHOOK_SIGNING_SECRET", "");
    const { getStripePlugin } = await import("./stripe");

    expect(getStripePlugin()).toBeUndefined();
  });

  it("requires a webhook secret for the hosted production billing plugin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_IS_CLOUD", "true");
    vi.stubEnv("STRIPE_WEBHOOK_SIGNING_SECRET", "");
    const { getStripePlugin } = await import("./stripe");

    expect(() => getStripePlugin()).toThrow(
      "STRIPE_WEBHOOK_SIGNING_SECRET is required in production",
    );
  });
});
