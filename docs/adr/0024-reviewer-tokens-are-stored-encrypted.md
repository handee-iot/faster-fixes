# ADR-0024: Reviewer tokens are stored encrypted so invites can be resent

- **Status**: Accepted
- **Date**: 2026-10-19

## Context

Resending an invite (ADR-0023) needs the Reviewer's raw token, and the
database stores only its SHA-256 hash. Rotating the token on every resend
would silently break the links a Reviewer already has: the widget keeps the
token in localStorage, so an armed client would start failing submissions
until they opened a new link.

The repo already stores reversible secrets encrypted at rest for Trackers
(ADR-0003), with one key per integration and a cipher built on first use.

## Decision

- `Reviewer.tokenEncrypted` holds an AES-256-GCM copy of the token, next to
  the hash that lookups use.
- The key is `REVIEWER_TOKEN_ENCRYPTION_KEY`, loaded lazily. Creation stores
  the copy only when the key is present, so a self-hosted instance without it
  still creates reviewers; only resending needs it.
- A resend decrypts the stored copy and re-sends the same links.
- A Reviewer created before the column existed has no copy: a resend issues a
  fresh token, and the UI says the old links no longer work.

## Alternatives considered

- **Rotate on every resend**: simpler, but it breaks the token cached in an
  active client's browser and any link they kept.
- **Store the raw token**: a plaintext bearer secret at rest, which the
  hashing exists to avoid.
- **Point the resend at the portal sign-in instead**: the email would lose the
  widget link, and the client would have to ask for a magic link.

## Consequences

- Instances with the key set now hold a reversible copy of every reviewer
  token; the hash remains what lookups use.
- Resending never changes a link unless the Reviewer predates the column.
