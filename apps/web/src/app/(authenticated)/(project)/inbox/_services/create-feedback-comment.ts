import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { inngest } from "@/server/inngest";
import {
  buildEvent,
  feedbackMemberRepliedEvent,
} from "@/server/inngest/events";
import { prisma } from "@workspace/db";
import type { CreateFeedbackCommentInput } from "./create-feedback-comment.schema";

export async function createFeedbackComment(
  { feedbackId, body, userId }: CreateFeedbackCommentInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const feedback = await db.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true, project: { select: { organizationId: true } } },
  });

  if (!feedback) {
    throw new NotFoundError("Feedback not found.");
  }

  // Membership in the Feedback's Organization needs the loaded row, so the
  // denial lives here rather than at the transport edge.
  const membership = await db.member.findFirst({
    where: { organizationId: feedback.project.organizationId, userId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  // Dashboard replies are always a Member author (ADR-0018).
  const comment = await db.feedbackComment.create({
    data: { feedbackId, authorType: "member", memberId: membership.id, body },
  });

  // Fire-and-forget: the Reviewer learns about the reply by email (ADR-0019).
  inngest
    .send(
      buildEvent(feedbackMemberRepliedEvent, {
        feedbackId,
        commentId: comment.id,
      }),
    )
    .catch(() => {});

  return {
    id: comment.id,
    createdAt: comment.createdAt,
    authorType: "member" as const,
    body: comment.body,
    author: {
      id: membership.id,
      name: membership.user.name,
      image: membership.user.image,
    },
  };
}
