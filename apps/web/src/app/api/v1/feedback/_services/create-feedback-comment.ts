import { NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";

type CreateFeedbackCommentInput = {
  projectId: string;
  feedbackId: string;
  reviewerId: string;
  body: string;
};

/**
 * Stores a Reviewer's reply on one Feedback. Scoped by projectId so a forged
 * feedback id from another Project cannot be replied to; the caller has already
 * checked the Reviewer token.
 */
export async function createFeedbackComment({
  projectId,
  feedbackId,
  reviewerId,
  body,
}: CreateFeedbackCommentInput) {
  const feedback = await prisma.feedback.findFirst({
    where: { id: feedbackId, projectId },
    select: { id: true },
  });

  if (!feedback) {
    throw new NotFoundError("Feedback not found.");
  }

  // Widget replies are always a Reviewer author (ADR-0018).
  const comment = await prisma.feedbackComment.create({
    data: { feedbackId, authorType: "reviewer", reviewerId, body },
    include: { reviewer: { select: { id: true, name: true } } },
  });

  return {
    id: comment.id,
    createdAt: comment.createdAt,
    authorType: "reviewer" as const,
    body: comment.body,
    author: comment.reviewer
      ? { id: comment.reviewer.id, name: comment.reviewer.name }
      : null,
  };
}

export type CreateFeedbackCommentOutput = Awaited<
  ReturnType<typeof createFeedbackComment>
>;
