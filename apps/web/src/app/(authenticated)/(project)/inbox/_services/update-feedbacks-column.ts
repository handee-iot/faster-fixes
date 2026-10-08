import type { FeedbackStatus } from "@/app/_domains/feedback";
import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { inngest } from "@/server/inngest";
import {
  buildEvent,
  feedbackStatusChangedEvent,
} from "@/server/inngest/events";
import { prisma } from "@workspace/db";
import type { UpdateFeedbacksColumnInput } from "./update-feedbacks-column.schema";

// The board's write path: a column carries its category, so moving a card sets
// both columnId and status in one write (ADR-0017). Single drags and bulk moves
// share this service.
export async function updateFeedbacksColumn(
  {
    feedbackIds,
    columnId,
    userId,
  }: UpdateFeedbacksColumnInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const column = await db.feedbackColumn.findUnique({
    where: { id: columnId },
    include: { project: { select: { organizationId: true } } },
  });

  if (!column) {
    throw new NotFoundError("Column not found.");
  }

  // Membership in the column's Organization needs the loaded row, so the
  // denial lives here rather than at the transport edge.
  const membership = await db.member.findFirst({
    where: { organizationId: column.project.organizationId, userId },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  // Scoping by projectId keeps a forged id from pulling another project's
  // feedback onto this board.
  const scope = {
    id: { in: feedbackIds },
    projectId: column.projectId,
  };
  const previous = await db.feedback.findMany({
    where: scope,
    select: { id: true, status: true },
  });

  await db.feedback.updateMany({
    where: scope,
    data: { columnId: column.id, status: column.category },
  });

  // Same-category moves (In Progress → In Test) are invisible to trackers and
  // notifications by design; only real status changes fan out.
  const events = previous
    .filter((feedback) => feedback.status !== column.category)
    .map((feedback) =>
      buildEvent(feedbackStatusChangedEvent, {
        feedbackId: feedback.id,
        newStatus: column.category as FeedbackStatus,
        // Board moves are always a human in the inbox.
        actor: "user",
      }),
    );
  if (events.length > 0) inngest.send(events).catch(() => {});

  return { count: previous.length };
}
