import type { FeedbackCommentAuthorType } from "@/app/_domains/feedback";
import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import type { ListFeedbackCommentsInput } from "./list-feedback-comments.schema";

export async function listFeedbackComments(
  { feedbackId, userId }: ListFeedbackCommentsInput & { userId: string },
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
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  const comments = await db.feedbackComment.findMany({
    where: { feedbackId },
    orderBy: { createdAt: "asc" },
    include: {
      reviewer: { select: { id: true, name: true } },
      member: {
        select: {
          id: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  return comments.map((comment) => ({
    id: comment.id,
    createdAt: comment.createdAt,
    authorType: comment.authorType as FeedbackCommentAuthorType,
    body: comment.body,
    author: toAuthor(comment),
  }));
}

type CommentWithAuthors = {
  authorType: string;
  reviewer: { id: string; name: string } | null;
  member: {
    id: string;
    user: { id: string; name: string; image: string | null };
  } | null;
};

function toAuthor(comment: CommentWithAuthors) {
  if (comment.authorType === "member" && comment.member) {
    return {
      id: comment.member.id,
      name: comment.member.user.name,
      image: comment.member.user.image,
    };
  }
  if (comment.reviewer) {
    return {
      id: comment.reviewer.id,
      name: comment.reviewer.name,
      image: null,
    };
  }
  return null;
}

export type ListFeedbackCommentsOutput = Awaited<
  ReturnType<typeof listFeedbackComments>
>;
