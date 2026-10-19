# ADR-0023: Reviewers are invited by email when one is recorded

- **Status**: Accepted
- **Date**: 2026-10-19

## Context

Adding a Reviewer only returned their share link to the Member who created
them, who then had to pass it on by hand. Reviewers also had no way into the
board unless they guessed the portal's address and asked for a magic link
(ADR-0021). Reviewers may have no email at all (ADR-0019), and the raw token
only exists at creation: the database stores a SHA-256 hash.

## Decision

Creating a Reviewer with an email sends them an invite email:

- The subject names the Project; the body carries two links: the board
  hand-off (`/portal/handoff?token=…`, ADR-0022), which signs them in in one
  click, and the widget link on their own site (`?ff_token=…`), so they can
  report something new.
- It goes out as a `reviewer/created` Inngest event carrying the raw token, so
  a mailer outage never fails the creation, and delivery retries on its own.
- A Reviewer with no recorded email is skipped silently, as with the resolve
  and reply emails (ADR-0019).
- There is no resend in this decision: the raw token is not recoverable here.
  ADR-0024 adds an encrypted copy for exactly that, so resending re-sends the
  same links.

## Alternatives considered

- **Point the invite at `/portal` and let them ask for a magic link**: two
  steps (open the portal, then wait for another email) instead of one, and the
  invite would still have to explain the sign-in.
- **Send the invite from the create service inline**: the creation would fail
  (or the Member would see an error) when the mailer is down.
- **Store the raw token so invites can be resent**: keeps a bearer secret in
  plaintext, which the hashing was there to avoid.

## Consequences

- The invite is the only email that carries the raw token; the token in it is
  the same credential the widget link already carries, so the exposure is
  unchanged.
- Rotating a Reviewer's token (should that ship) must send a fresh invite, or
  the Reviewer is left with dead links.
