/**
 * Email branding. A self-hosted instance sets BRAND_NAME and BRAND_URL so
 * every email it sends carries its own identity; the defaults keep the hosted
 * app's look.
 */
const configuredName = process.env.BRAND_NAME?.trim();
const configuredUrl = process.env.BRAND_URL?.trim();
const configuredLogoUrl = process.env.BRAND_LOGO_URL?.trim();

export const BRAND = {
  name: (configuredName === "" ? undefined : configuredName) ?? "Faster Fixes",
  url:
    (configuredUrl === "" ? undefined : configuredUrl) ??
    "https://www.faster-fixes.com",
  // Optional absolute URL of the brand's logo for email headers. Without it
  // the header falls back to the brand name as text.
  logoUrl: configuredLogoUrl === "" ? undefined : configuredLogoUrl,
} as const;
