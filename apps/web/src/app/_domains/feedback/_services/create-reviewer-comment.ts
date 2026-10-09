import { NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";

type CreateReviewerCommentInput = {
  projectId: string;
  feedbackId: string;
  reviewerId: string;
  body: string;
};

/**
 * Stores a Reviewer's reply on one Feedback, from the widget or the portal
 * (ADR-0018: both are always reviewer-authored). Scoped by projectId so a
 * forged feedback id from another Project cannot be replied to; the caller
 * has already checked the Reviewer.
 */
export async function createReviewerComment(
  { projectId, feedbackId, reviewerId, body }: CreateReviewerCommentInput,
  db: typeof prisma = prisma,
) {
  const feedback = await db.feedback.findFirst({
    where: { id: feedbackId, projectId },
    select: { id: true },
  });

  if (!feedback) {
    throw new NotFoundError("Feedback not found.");
  }

  const comment = await db.feedbackComment.create({
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

export type CreateReviewerCommentOutput = Awaited<
  ReturnType<typeof createReviewerComment>
>;
