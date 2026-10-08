import { updateFeedbackStatuses } from "@/app/_domains/feedback/_services/update-feedback-statuses";
import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { inngest } from "@/server/inngest";
import {
  buildEvent,
  feedbackStatusChangedEvent,
} from "@/server/inngest/events";
import { prisma } from "@workspace/db";
import type { UpdateFeedbacksStatusInput } from "./update-feedbacks-status.schema";

export async function updateFeedbacksStatus(
  {
    feedbackIds,
    status,
    userId,
  }: UpdateFeedbacksStatusInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const firstFeedback = await db.feedback.findUnique({
    where: { id: feedbackIds[0] },
    include: { project: { select: { organizationId: true } } },
  });

  if (!firstFeedback) {
    throw new NotFoundError("Feedback not found.");
  }

  // Membership in the Feedback's Organization needs the loaded row, so the
  // denial lives here rather than at the transport edge.
  const membership = await db.member.findFirst({
    where: { organizationId: firstFeedback.project.organizationId, userId },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  // Guarded: only rows whose status actually changes reset their board column (ADR-0017).
  await updateFeedbackStatuses(db, { id: { in: feedbackIds } }, status);

  // Fan-out: one event per feedback so each gets independent retries and
  // fault isolation — a single failing GitHub sync won't block the others.
  const events = feedbackIds.map((feedbackId) =>
    // Dashboard bulk edits are always a human in the inbox.
    buildEvent(feedbackStatusChangedEvent, {
      feedbackId,
      newStatus: status,
      actor: "user",
    }),
  );
  inngest.send(events).catch(() => {});

  return { count: feedbackIds.length };
}
