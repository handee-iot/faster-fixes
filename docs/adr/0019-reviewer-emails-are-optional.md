# Reviewer emails are optional, and notifications are transactional

- **Status**: Accepted
- **Date**: 2026-10-08

## Context

Comment threads restored the client conversation (ADR-0018), and ADR-0018 left one thing open: the Reviewer should hear about a team reply, and about their Feedback being resolved. BugHerd does both ("task done" emails). Emailing a Reviewer needs an address, and the Reviewer model has never stored one: reviewers are created from the dashboard with a name only, and the widget identifies them by a bearer token.

## Decision

- **`Reviewer.email` is optional.** The create dialog collects it and the reviewers table shows it. A blank field stores `null`; existing reviewers keep working with no email.
- **Two transactional emails exist: "resolved" and "new reply".** Resolve sends on every transition into `resolved` (dashboard, agent API, or a tracker webhook closing the linked issue). Reply sends when a Member replies on the Feedback's thread, through a new `feedback/member-replied` event emitted by the dashboard's comment service. Both skip silently when the Reviewer has no recorded email: no email is a normal state, not an error.
- **Both send regardless of the Reviewer's active state.** Revoking a share link removes widget access, not contact about reports the client made.
- **Neither email carries the Reviewer token or a link containing it.** Tokens are bearer credentials and emails get forwarded; the emails carry the comment text and a short page label instead.
- **`closed` does not email.** Closing is the team's archive, not a resolution.

## Alternatives considered

- **Require the email when creating a Reviewer.** Rejected: the team often shares a link before they have an address, and older reviewers would be stranded.
- **Put the reviewer's email on the Feedback instead.** Rejected: one client, one address; asking per submission would re-prompt the same person.
- **Link the email back to the widget with the token in the URL.** Rejected: forwarding leaks the token.
- **Batch replies into a digest.** Rejected for v1: per-reply emails match how the conversation actually flows; revisit if clients complain.

## Consequences

- Clients get notifications only once the team records their address; the dialog makes that a one-field decision at invite time.
- Re-resolving sends again; the event's meaning is "it is resolved now".
- Revoked reviewers still receive emails about their own reports; deleting the Reviewer stops them.
- Any future consumer of team replies (Slack reply notifications, digests) can subscribe to the same `feedback/member-replied` event.
