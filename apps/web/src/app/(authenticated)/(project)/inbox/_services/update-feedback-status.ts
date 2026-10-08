import { updateFeedbackStatuses } from "@/app/_domains/feedback/_services/update-feedback-statuses";
import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { inngest } from "@/server/inngest";
import {
  buildEvent,
  feedbackStatusChangedEvent,
} from "@/server/inngest/events";
import { prisma } from "@workspace/db";
import type { UpdateFeedbackStatusInput } from "./update-feedback-status.schema";

export async function updateFeedbackStatus(
  {
    feedbackId,
    status,
    userId,
  }: UpdateFeedbackStatusInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const feedback = await db.feedback.findUnique({
    where: { id: feedbackId },
    include: { project: { select: { organizationId: true } } },
  });

  if (!feedback) {
    throw new NotFoundError("Feedback not found.");
  }

  // Membership in the Feedback's Organization needs the loaded row, so the
  // denial lives here rather than at the transport edge.
  const membership = await db.member.findFirst({
    where: { organizationId: feedback.project.organizationId, userId },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  // Guarded: only an actual status change resets the card's board column (ADR-0017).
  await updateFeedbackStatuses(db, { id: feedbackId }, status);

  // Fire-and-forget: sync status to the linked tracker if there is one. Fans
  // out even on a no-op, unlike the agent API's service, which skips it: a
  // human in the inbox does not re-set the same status in a loop. The asymmetry
  // is deliberate; see ADR-0007.
  inngest
    .send(
      buildEvent(
        feedbackStatusChangedEvent,
        // Dashboard edits are always a human in the inbox.
        { feedbackId, newStatus: status, actor: "user" },
      ),
    )
    .catch(() => {});

  return { id: feedbackId };
}
