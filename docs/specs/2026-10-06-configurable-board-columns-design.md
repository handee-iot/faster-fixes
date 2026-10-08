# Configurable board columns

- **Date**: 2026-10-06 (ported 2026-10-08)
- **Status**: Draft — awaiting review
- **Decision record**: [ADR-0017](../adr/0017-board-columns-are-a-layer-over-status.md)
- **Origin**: ported from StraightArrowAI's fork, adapted to this repository's architecture

## Goal

Let each Project define its own kanban columns. The immediate need is an **In Test**
column between In progress and Resolved; the general need is that teams can add,
rename, reorder, and remove columns without a code change.

## Non-goals (v1)

- Column colors.
- Changing a column's category after creation.
- Surfacing column names in Slack, the widget, MCP, or tracker sync.
- Organization-level column templates.
- Drag-to-reorder columns in settings (up/down buttons only).

## Model

Status stays exactly as it is. A **Column** is a per-Project lane that belongs to one
**Category**, and the category set is the existing non-archived Status literals:
`new | in_progress | resolved`. `closed` (Archived) is never a column.

```prisma
model FeedbackColumn {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  name     String
  category String // "new" | "in_progress" | "resolved"; validated by FeedbackColumnCategoryEnum
  position Int

  feedback Feedback[]

  @@index([projectId, position])
  @@map("feedback_column")
}

model Feedback {
  // ...existing fields
  columnId String?
  column   FeedbackColumn? @relation(fields: [columnId], references: [id], onDelete: SetNull)
}
```

**Invariant:** when `columnId` is set, `column.category === feedback.status`.
**Null `columnId`** means "the first column, by position, in the Feedback's status
category". This lets create paths (widget `POST /api/v1/feedback`, agent
`create-feedbacks.ts`) stay untouched and makes deleting a column safe.

Every Project always has at least one column per category.

## Migration

1. Create `feedback_column` and `feedback.columnId`.
2. Seed three columns for every existing Project: New (`new`, 0), In progress
   (`in_progress`, 1), Resolved (`resolved`, 2).
3. Backfill `feedback.columnId` from `status` for non-archived rows, so later
   reordering doesn't move existing cards.
4. Both project-create mutations (sidebar and onboarding) seed the same three
   defaults through `DEFAULT_FEEDBACK_COLUMNS` (`_domains/feedback/_helpers`).

## Write rules

A single service owns the invariant: `updateFeedbackStatuses` (feedback domain
`_services/`) performs every non-board status write and only touches rows whose
status actually changes, resetting the column to null when it does.

| Write                                                                 | Effect                                                                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Move card to a column (board drag, column select, bulk "move to")     | `columnId = column.id`, `status = column.category`                                                                  |
| Status set elsewhere — Linear/Jira/GitHub sync, agent status API, MCP | Keep current `columnId` if its category equals the new status; otherwise `null` (falls to first column of category) |
| Archive (`status = closed`)                                           | `columnId = null`                                                                                                   |
| Unarchive                                                             | Treated as "status set elsewhere"                                                                                   |

The "keep current column" branch is what stops an inbound Linear `started` sync from
yanking a card out of In Test back into In progress.

Status-change events and tracker sync continue to key off `status`. A move between two
columns of the same category (In progress → In Test) changes no status, emits no
status-change event, and triggers no tracker sync.

Paths that call the service (or the inline guard, for tracker syncs):

- `inbox/_services/update-feedback-status.ts` (panel + single moves)
- `inbox/_services/update-feedbacks-status.ts` (bulk "move to")
- `api/v1/agent/feedbacks/[id]/status/_services/update-feedback-status.ts`
- `_domains/integration/_services/{linear,jira,github}/sync-*-issue-status.inngest.ts`
  (inline guard: `updateMany` with `status: { not: newStatus }` and `columnId: null`)

## Board and inbox UI

- A service returns the Project's columns ordered by `position`
  (`settings/_services/list-feedback-columns.ts`), exposed through the scope router.
- `kanban-board.client.tsx` renders one lane per column and groups cards by
  `columnId ?? firstColumnOf(status)` (via `inbox/_helpers/get-board-column-id.ts`).
  Archived cards remain excluded.
- Card drop calls a new move service (single and bulk:
  `inbox/_services/update-feedbacks-column.ts`).
- The panel's `status-select.client.tsx` and the bulk toolbar's "move to" list columns,
  plus the existing Archive action.

## Settings UI

A **Board columns** section in project settings (`settings/_features/board-columns/`):

- List columns in order with their category.
- Add: name + category. Inserted at the end of its category group.
- Rename inline.
- Reorder with up/down buttons. A column cannot move outside its category group, so
  lanes always read New → In progress → Resolved left to right.
- Delete: blocked if it is the last column in its category. If the column has cards,
  the confirm dialog states they move to the first remaining column in that category.

Validation (Zod): name 1–40 chars, unique per Project (case-insensitive).

## Unchanged

Widget (`STATUS_COLORS` keyed on `status`), MCP schemas, Slack blocks, the tracker
mapping files, `FeedbackStatusEnum`.

## Testing

- Unit: `updateFeedbackStatuses` — only rows whose status changes are touched; a
  same-status write leaves the column alone.
- Unit: `getBoardColumnId` — pinned column kept, stale/absent column falls back to the
  first column of the category.
- Migration: run `pnpm --filter @workspace/db migrate:dev` against a seeded DB; assert
  every non-archived Feedback has a column whose category matches its status.
- Manual: add In Test, move a card through it, confirm a linked Linear issue's state is
  untouched by the In progress ↔ In Test move and updates on Resolved.
