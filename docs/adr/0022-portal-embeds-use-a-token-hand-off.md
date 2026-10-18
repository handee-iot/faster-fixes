# ADR-0022: Portal embeds use a token hand-off

- **Status**: Accepted
- **Date**: 2026-10-18

## Context

Clients should see their board inside the Handee CRM's client portal instead of
signing into Faster Fixes separately. The portal already renders the board
(ADR-0021) behind a magic-link sign-in, and the CRM renders the frame
server-side. The board has to appear without the portal's own chrome, and it
has to stay signed in inside an iframe. Magic links do not fit: they need an
email round trip, and many reviewers have no email at all (ADR-0019).

## Decision

The portal accepts a token hand-off and an embed mode:

- `GET /portal/handoff?token=<reviewer token>` verifies the token against an
  active Reviewer, sets it as an HttpOnly, SameSite=Lax cookie scoped to the
  site (12 hours; site-wide because the board's data calls go to `/api/trpc`),
  and redirects to `/portal/embed`, so the token does not linger in the
  frame's history.
- `/portal/embed` renders the board with no header and no sign-out, resolving
  the Reviewer from the signed-in User's email or from the cookie.
- The portal's tRPC procedures resolve the Reviewer the same way and rate-limit
  by Reviewer.
- `frame-ancestors` allows `crm.handee.co.za` on `/portal/*`; the global
  `X-Frame-Options: SAMEORIGIN` stays for everything else.

## Alternatives considered

- **Magic-link sign-in inside the iframe**: the client would have to leave the
  CRM, open email and click; reviewers without an email cannot sign in at all.
- **Minting a Better Auth session for the Reviewer**: the hand-off would have
  to find or create a User and drive Better Auth's internals to create the
  session and cookie; more coupling for no gain, and it still needs an email.
- **Rebuilding the board in the CRM against the agent API**: duplicates the
  portal's UI, and the agent API has no comments or columns endpoints today.
- **One-time hand-off codes minted by the agent API**: better token hygiene,
  but it needs a new API endpoint and a CRM server round trip per render; the
  reviewer token already travels in reviewer links.

## Consequences

- The reviewer token is a bearer credential the CRM holds server-side and puts
  in the frame URL; it is the same credential the widget link already carries.
  Rotating or deactivating the Reviewer invalidates the embed immediately,
  because every request re-resolves it.
- The embed shares the portal's session surface: any Reviewer-scoped feature
  lands in both surfaces at once.
- Anything else that frames the portal needs its origin added to
  `frame-ancestors`.
