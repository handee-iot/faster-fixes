import { BadRequestError } from "@/server/errors/domain-errors";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import type { FileAttachment } from "@fasterfixes/core";
import { prisma } from "@workspace/db";

type LinkFeedbackAttachmentsInput = {
  feedbackId: string;
  assetIds?: readonly string[];
};

/**
 * Attaches uploaded files to the Feedback itself (ADR-0026). Every id must
 * resolve to an Asset under this Feedback's prefix and not already sit
 * anywhere, so a client cannot attach someone else's upload by guessing an id.
 */
export async function linkFeedbackAttachments(
  { feedbackId, assetIds }: LinkFeedbackAttachmentsInput,
  db: typeof prisma = prisma,
): Promise<FileAttachment[]> {
  if (!assetIds || assetIds.length === 0) return [];

  const ids = [...new Set(assetIds)];
  const assets = await db.asset.findMany({
    where: { id: { in: ids } },
    select: { id: true, key: true },
  });

  const prefix = `feedback-attachments/${feedbackId}/`;
  if (
    assets.length !== ids.length ||
    assets.some((asset) => !asset.key.startsWith(prefix))
  ) {
    throw new BadRequestError(
      "One of the attachments does not belong to this feedback.",
    );
  }

  const taken = await db.feedbackAttachment.findFirst({
    where: { assetId: { in: ids } },
    select: { id: true },
  });
  if (taken) {
    throw new BadRequestError("One of the attachments is already attached.");
  }

  // Each upload is its own request, so the next position is wherever the
  // report's files end today.
  const start = await db.feedbackAttachment.count({ where: { feedbackId } });

  const linked = await Promise.all(
    ids.map((assetId, index) =>
      db.feedbackAttachment.create({
        data: { feedbackId, assetId, position: start + index },
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
