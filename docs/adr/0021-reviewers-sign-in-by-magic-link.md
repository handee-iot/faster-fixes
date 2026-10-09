# Reviewers sign in by magic link and manage their own Project's Feedback

- **Status**: Accepted
- **Date**: 2026-10-09

## Context

Reviewers (clients) work through the widget with a bearer token. They cannot see the board, and sharing a token with a whole client team is awkward. The team wants clients to follow and manage their own tickets, without the member surface (integrations, settings, other projects).

## Decision

- Reviewers sign in at `/portal` with a **magic link** (Better Auth's plugin): no password to manage, and the address already lives on the Reviewer row (FFIX-12).
- Only an **active Reviewer's email** receives a link. The send callback resolves the Reviewer and stays silent otherwise, so the endpoint cannot be used to enumerate reviewers.
- The portal session is a normal Better Auth session; the portal's procedures additionally require an active Reviewer for the session's email, and scope every read and write to that Reviewer's Project.
- Reviewers can: see the board (columns and cards), open a card's detail (report, screenshot, location, number), comment, and move cards between columns (which sets the status, ADR-0017). They cannot: assign, delete, archive, touch integrations or settings, or see any other Project.
- Reviewers without an email cannot sign in; their widget token keeps working.

## Alternatives considered

- **Password accounts for reviewers.** Another credential to create, reset and support.
- **A portal URL carrying the reviewer token.** No session, no per-person audit, and the link leaks when forwarded.
- **Member accounts with a restricted role.** Members are Organization people; a reviewer belongs to one Project and must never appear as one.

## Consequences

- A reviewer's first magic-link sign-in creates a User row with no memberships; the admin user list will show it. Marking reviewer users is a follow-up.
- Accounts are per email: a person reviewing two Projects signs in once and lands on the Project of their first active Reviewer row.
- The widget and the portal share the same Feedback, comments and numbering.
