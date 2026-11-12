import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { deleteAsset } from "@/server/storage/delete-asset";
import { deleteAssets } from "@/server/storage/delete-assets";
import { prisma } from "@workspace/db";
import type { DeleteFeedbackInput } from "./delete-feedback.schema";

export async function deleteFeedback(
  { feedbackId, userId }: DeleteFeedbackInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const feedback = await db.feedback.findUnique({
    where: { id: feedbackId },
    include: { project: { select: { organizationId: true } } },
  });

  if (!feedback) {
    throw new NotFoundError("Feedback not found.");
  }

  if (feedback.status !== "closed") {
    throw new BadRequestError(
      "Only archived feedback can be permanently deleted.",
    );
  }

  // Membership in the Feedback's Organization needs the loaded row, so the
  // denial lives here rather than at the transport edge.
  const membership = await db.member.findFirst({
    where: { organizationId: feedback.project.organizationId, userId },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  if (feedback.screenshotId) {
    await deleteAsset(feedback.screenshotId);
  }

  // Comment attachments go with the Feedback: their rows cascade, their files
  // do not (ADR-0026).
  const commentAttachments = await db.feedbackCommentAttachment.findMany({
    where: { comment: { feedbackId } },
    select: { assetId: true },
  });
  if (commentAttachments.length > 0) {
    await deleteAssets(commentAttachments.map(({ assetId }) => assetId));
  }

  await db.feedback.delete({ where: { id: feedbackId } });

  return { id: feedbackId };
}
