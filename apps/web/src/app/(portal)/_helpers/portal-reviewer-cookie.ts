/**
 * The cookie the CRM embed's hand-off sets (ADR-0022): the Reviewer's token,
 * HttpOnly and scoped to /portal, so the embedded board stays signed in
 * without a magic-link round trip.
 */
export const PORTAL_REVIEWER_COOKIE = "portal_reviewer";
