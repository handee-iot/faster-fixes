import { prisma } from "@workspace/db";

type ListReviewerCommentsInput = {
  projectId: string;
  feedbackId: string;
};

/**
 * The comment thread on one Feedback, oldest first, from the widget or the
 * portal (ADR-0021). Scoped by projectId; the caller has already resolved the
 * Reviewer.
 */
export async function listReviewerComments(
  { projectId, feedbackId }: ListReviewerCommentsInput,
  db: typeof prisma = prisma,
) {
  const comments = await db.feedbackComment.findMany({
    where: { feedbackId, feedback: { projectId } },
    orderBy: { createdAt: "asc" },
    include: {
      reviewer: { select: { id: true, name: true } },
      member: {
        select: { id: true, user: { select: { id: true, name: true } } },
      },
    },
  });

  return comments.map((comment) => ({
    id: comment.id,
    createdAt: comment.createdAt,
    authorType: comment.authorType,
    body: comment.body,
    author: toAuthor(comment),
  }));
}

type CommentWithAuthors = {
  authorType: string;
  reviewer: { id: string; name: string } | null;
  member: { id: string; user: { id: string; name: string } } | null;
};

function toAuthor(comment: CommentWithAuthors) {
  if (comment.authorType === "member" && comment.member) {
    return { id: comment.member.id, name: comment.member.user.name };
  }
  if (comment.reviewer) {
    return { id: comment.reviewer.id, name: comment.reviewer.name };
  }
  return null;
}

export type ListReviewerCommentsOutput = Awaited<
  ReturnType<typeof listReviewerComments>
>;
