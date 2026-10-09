# Feedback numbers are per-Project and monotonic

- **Status**: Accepted
- **Date**: 2026-10-09

## Context

Reviewers and the team refer to Feedback by its text, which is awkward in conversation. BugHerd shows a task number (`#266`) that everyone quotes, and the widget's list and detail should offer the same handle.

## Decision

- Every Feedback carries a `number`, unique per Project, assigned on creation.
- `Project.feedbackSequence` is the counter; each creation advances it by the batch size and takes the reserved range, so numbering survives deletes and never collides under concurrent submissions.
- The migration backfills existing rows by creation order (oldest = 1) and sets each Project's sequence to its highest number.
- Gaps are allowed: a failed create may skip numbers. Numbers are never reused.
- Both creation paths allocate from the same counter: the widget's submit and the agent API's bulk import.

## Alternatives considered

- **`MAX(number) + 1` per insert.** Races between concurrent submissions; needs retry loops.
- **Global numbering.** BugHerd's numbers are per Project, and a global counter would leak how much feedback other tenants have.
- **A Postgres sequence per Project.** Creates a schema object per tenant; unmanageable in migrations.

## Consequences

- The widget list shows the number as a badge, the detail header shows `#12`, and the dashboard panel shows it too, so a number works as a reference anywhere.
- BugHerd imports get fresh numbers in import order; the original BugHerd task numbers stay in BugHerd.
- Deletes leave gaps; that is normal and keeps the number stable for the life of the row.
