import { prisma } from "@workspace/db";

type ListFeedbackCommentsInput = {
  projectId: string;
  feedbackId: string;
};

/**
 * The comment thread on one Feedback, oldest first. The caller has already
 * resolved the Project, matched the origin and checked the Reviewer token, so
 * this read applies no access rule of its own (same contract as listFeedbacks).
 */
export async function listFeedbackComments({
  projectId,
  feedbackId,
}: ListFeedbackCommentsInput) {
  const comments = await prisma.feedbackComment.findMany({
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

export type ListFeedbackCommentsOutput = Awaited<
  ReturnType<typeof listFeedbackComments>
>;
