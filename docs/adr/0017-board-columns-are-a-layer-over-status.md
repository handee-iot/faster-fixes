# Board columns are a per-Project layer over Status, not a replacement for it

Teams need workflow lanes beyond New / In progress / Resolved (the first request is **In Test**). We add a per-Project **Column** that belongs to one **Category**, where the category set is the existing Status literals `new | in_progress | resolved`. `Feedback.status` keeps its meaning and stays the field everything outside the board reads.

Design ported from StraightArrowAI's fork (their ADR-0010) as part of the configurable board columns port; see the design spec at `docs/specs/2026-10-06-configurable-board-columns-design.md`.

## Decisions

- **Status stays the contract; Column is a board-layer addition.** Each Column has an immutable category drawn from the non-archived Status literals. The invariant: when a Feedback's `columnId` is set, `column.category` equals `feedback.status`. A null `columnId` means "the first column, by position, of the Feedback's status category".
- **Everything outside the board keeps reading Status.** The widget colours pins from `feedback.status` and shipped widget builds cannot be updated in place; the MCP schema, Slack blocks, and the Linear/Jira/GitHub mappings all key on it. Linear and Jira solve the same problem the same way: user-named states over a fixed type/category taxonomy.
- **Non-board status writes never move a card out of a same-category lane.** A status write only touches rows whose status actually changes, so a tracker echo or an agent looping a queue leaves a card in "In Test". Only a real status change resets the column (to null, falling back to the first column of the new category).
- **A table with `onDelete: SetNull`, not JSON on Project.** Deleting a column is safe without cleanup code: affected cards fall back to the first remaining column of their category, and the last column per category cannot be deleted.

## Considered Options

- **Make columns replace Status.** Rejected: `status` is a published contract (widget builds in the wild, MCP schema, Slack blocks, tracker mappings), so replacing it would migrate every consumer.
- **Add an `in_test` status literal.** Rejected: it would touch every Status consumer (three tracker mappings, widget colours, MCP enum, Slack) and would be migrated again when configurable columns land.
- **Store columns as JSON on Project.** Rejected: a foreign key with `onDelete: SetNull` makes column deletion safe without cleanup code.

## Consequences

- One service owns the invariant: `updateFeedbackStatuses` in the feedback domain performs every non-board status write, guarded so only an actual status change resets the column. The three tracker syncs apply the same one-line guard inline, because cross-domain service imports are not permitted.
- Moves between columns of the same category are invisible to trackers and notifications by design: no status change, no status-change event.
- A column's category is immutable; changing it would silently re-status every card in it and fan out tracker syncs.
