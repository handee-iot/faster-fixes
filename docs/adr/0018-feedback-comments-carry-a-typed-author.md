# Feedback comments carry a typed author (Reviewer or Member)

The Feedback thread is a conversation between the person who reported it and the team. We need to know, per message, which side wrote it, and we want a name and avatar to render. The author is one of two entities with different tables: a **Reviewer** (no account) or a **Member** (a User in an Organization).

## Decisions

- **One `FeedbackComment` table with a typed author.** `authorType` is `reviewer` or `member`; exactly one of the nullable `reviewerId` / `memberId` foreign keys is set to match. Both FKs use `onDelete: SetNull`, so deleting a Reviewer or Member never deletes the conversation; the message stays with a null author and the UI renders it as a former participant.
- **The Feedback's original `comment` stays the report text.** It is never copied into the thread and remains the field the inbox, exports, and trackers read. A thread with zero comments is normal.
- **Visibility follows the existing reviewer rule.** A Reviewer reads the thread on any Feedback in the Project their token belongs to (the same rule `listFeedbacks` already applies: reviewer tokens gate the Project, not one Feedback). Members read it when they belong to the Feedback's Organization.
- **Ordering is creation order, oldest first.** A conversation reads top to bottom; the UI renders the original report above the thread.

## Considered Options

- **Two tables (`ReviewerComment`, `MemberComment`).** Rejected: the thread query would be a union of two tables plus a sort, and every consumer would re-implement the merge.
- **A single `authorId` with no foreign key.** Rejected: no referential integrity, and the UI still needs the join to render a name.
- **Cascade-delete comments with the Reviewer.** Rejected: deleting a client contact would erase the team's side of the conversation. Messages outlive participants.

## Consequences

- One invariant lives in the services: `authorType` matches the set FK. The widget API always writes `reviewer`, the dashboard always writes `member`; no path can write a mismatched pair.
- A message whose author was deleted renders as a former participant rather than disappearing.
- Reviewer email notifications on a team reply are a deliberate follow-up; they belong with the resolve-email work (FFIX-12).
