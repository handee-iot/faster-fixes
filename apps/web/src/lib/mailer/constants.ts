const configuredMailDomain = process.env.MAIL_FROM_DOMAIN?.trim();
const MAIL_DOMAIN =
  (configuredMailDomain === "" ? undefined : configuredMailDomain) ??
  process.env.DOMAIN_NAME;

export const NO_REPLY_EMAIL = `noreply@${MAIL_DOMAIN}`;
export const SENDER_EMAIL = `contact@${MAIL_DOMAIN}`;
