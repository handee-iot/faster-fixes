import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { prisma } from "@workspace/db";

type ListReviewerCommentsInput = {
  projectId: string;
  feedbackId: string;
};

/**
 * The comment thread on one Feedback, oldest first, from the widget or the
 * portal (ADR-0021). Scoped by projectId; the caller has already resolved the
 * Reviewer. Attachments come with a signed URL each (ADR-0026).
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
      attachments: { orderBy: { position: "asc" }, include: { asset: true } },
    },
  });

  return Promise.all(
    comments.map(async (comment) => ({
      id: comment.id,
      createdAt: comment.createdAt,
      authorType: comment.authorType,
      body: comment.body,
      author: toAuthor(comment),
      attachments: await Promise.all(
        comment.attachments.map(async ({ asset }) => ({
          id: asset.id,
          filename: asset.filename,
          mimeType: asset.mimeType,
          size: asset.size,
          url: await getSignedAssetUrl(asset),
        })),
      ),
    })),
  );
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
