/**
 * Email branding. A self-hosted instance sets BRAND_NAME and BRAND_URL so
 * every email it sends carries its own identity; the defaults keep the hosted
 * app's look.
 */
const configuredName = process.env.BRAND_NAME?.trim();
const configuredUrl = process.env.BRAND_URL?.trim();

export const BRAND = {
  name: (configuredName === "" ? undefined : configuredName) ?? "Faster Fixes",
  url:
    (configuredUrl === "" ? undefined : configuredUrl) ??
    "https://www.faster-fixes.com",
} as const;
