// Self-hosted instances send from their own address. EMAIL_FROM overrides the
// domain-derived default (e.g. Resend's onboarding@resend.dev before a sending
// domain is verified).
const FROM = process.env.EMAIL_FROM;

export const NO_REPLY_EMAIL = FROM ?? `noreply@${process.env.DOMAIN_NAME}`;
export const SENDER_EMAIL = FROM ?? `contact@${process.env.DOMAIN_NAME}`;
