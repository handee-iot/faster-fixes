import type { FeedbackStatus } from "@/app/_domains/feedback";
import { NotFoundError } from "@/server/errors/domain-errors";
import { inngest } from "@/server/inngest";
import {
  buildEvent,
  feedbackStatusChangedEvent,
} from "@/server/inngest/events";
import { prisma } from "@workspace/db";

/**
 * Moves a Feedback to one of its Project's columns (ADR-0017: the column's
 * category is the status). Scoped by projectId; the caller has already
 * resolved the Reviewer. A move is a status change, so Trackers and the
 * resolve email follow it like any other.
 */
export async function moveFeedbackColumn(
  {
    projectId,
    feedbackId,
    columnId,
  }: { projectId: string; feedbackId: string; columnId: string },
  db: typeof prisma = prisma,
) {
  const column = await db.feedbackColumn.findFirst({
    where: { id: columnId, projectId },
    select: { id: true, category: true },
  });

  if (!column) {
    throw new NotFoundError("Column not found.");
  }

  const feedback = await db.feedback.findFirst({
    where: { id: feedbackId, projectId },
    select: { id: true },
  });

  if (!feedback) {
    throw new NotFoundError("Feedback not found.");
  }

  await db.feedback.update({
    where: { id: feedbackId },
    data: { columnId: column.id, status: column.category },
  });

  // Fire-and-forget, like the dashboard's move path.
  inngest
    .send(
      buildEvent(feedbackStatusChangedEvent, {
        feedbackId,
        newStatus: column.category as FeedbackStatus,
        actor: "user",
      }),
    )
    .catch(() => {});

  return { id: feedbackId, columnId: column.id, status: column.category };
}
