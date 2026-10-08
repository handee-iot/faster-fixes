const configuredMailDomain = process.env.MAIL_FROM_DOMAIN?.trim();
const MAIL_DOMAIN =
  (configuredMailDomain === "" ? undefined : configuredMailDomain) ??
  process.env.DOMAIN_NAME;

// Full-address override for providers that only allow a specific sender before
// a domain is verified (e.g. Resend's onboarding@resend.dev).
const FROM = process.env.EMAIL_FROM;

export const NO_REPLY_EMAIL = FROM ?? `noreply@${MAIL_DOMAIN}`;
export const SENDER_EMAIL = FROM ?? `contact@${MAIL_DOMAIN}`;
