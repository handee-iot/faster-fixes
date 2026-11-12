import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import type { FileAttachment } from "@fasterfixes/core";

type AssetForAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  key: string;
  bucket: string;
};

/**
 * The wire shape of attached files (ADR-0026): the Asset's facts plus a
 * short-lived signed URL, for a Feedback's report files or a comment's.
 */
export async function toFileAttachments(
  rows: readonly { asset: AssetForAttachment }[],
): Promise<FileAttachment[]> {
  return Promise.all(
    rows.map(async ({ asset }) => ({
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      size: asset.size,
      url: await getSignedAssetUrl(asset),
    })),
  );
}
