import { BadRequestError } from "@/server/errors/domain-errors";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { prisma } from "@workspace/db";

export type CommentAttachmentPayload = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
};

type LinkCommentAttachmentsInput = {
  commentId: string;
  feedbackId: string;
  assetIds?: readonly string[];
};

/**
 * Attaches uploaded files to a comment (ADR-0026). Every id must resolve to an
 * Asset under this Feedback's prefix and not already sit on a comment, so a
 * client cannot attach someone else's upload by guessing an id.
 */
export async function linkCommentAttachments(
  { commentId, feedbackId, assetIds }: LinkCommentAttachmentsInput,
  db: typeof prisma = prisma,
): Promise<CommentAttachmentPayload[]> {
  if (!assetIds || assetIds.length === 0) return [];

  const ids = [...new Set(assetIds)];
  const assets = await db.asset.findMany({
    where: { id: { in: ids } },
    select: { id: true, key: true },
  });

  const prefix = `comment-attachments/${feedbackId}/`;
  if (
    assets.length !== ids.length ||
    assets.some((asset) => !asset.key.startsWith(prefix))
  ) {
    throw new BadRequestError(
      "One of the attachments does not belong to this feedback.",
    );
  }

  const taken = await db.feedbackCommentAttachment.findFirst({
    where: { assetId: { in: ids } },
    select: { id: true },
  });
  if (taken) {
    throw new BadRequestError(
      "One of the attachments is already on a comment.",
    );
  }

  const linked = await Promise.all(
    ids.map((assetId, position) =>
      db.feedbackCommentAttachment.create({
        data: { commentId, assetId, position },
        include: { asset: true },
      }),
    ),
  );

  return Promise.all(
    linked.map(async ({ asset }) => ({
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      size: asset.size,
      url: await getSignedAssetUrl(asset),
    })),
  );
}
