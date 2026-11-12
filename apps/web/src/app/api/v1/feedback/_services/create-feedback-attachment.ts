import { s3Client } from "@/server/storage";
import { createAsset } from "@/server/storage/create-asset";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import type { FileAttachment } from "@fasterfixes/core";
import { requireEnv } from "@/utils/environment/require-env";
import { putObject } from "@better-upload/server/helpers";
import crypto from "crypto";
import path from "path";

/** Where the file hangs: a reply (ADR-0026), or the report itself. */
export type AttachmentScope = "comment" | "feedback";

const KEY_PREFIX: Record<AttachmentScope, string> = {
  comment: "comment-attachments",
  feedback: "feedback-attachments",
};

type CreateFeedbackAttachmentInput = {
  feedbackId: string;
  scope: AttachmentScope;
  /** The original filename, kept for the download and the extension. */
  filename: string;
  mimeType: string;
  body: Buffer<ArrayBuffer>;
  /** The uploading Member, or null for a Reviewer (they have no member row). */
  uploadedById: string | null;
};

/** A safe extension for the stored key: from the filename, else from the type. */
function extensionFor(filename: string, mimeType: string) {
  const fromName = path.extname(filename).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  const fromType = mimeType.split("/")[1]?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,8}$/.test(fromType) ? `.${fromType}` : "";
}

/**
 * Stores one attachment (ADR-0026) in the bucket and records the Asset that
 * points at it. The caller decides what an upload failure means, and links the
 * Asset to the comment or feedback it belongs to.
 */
export async function createFeedbackAttachment({
  feedbackId,
  scope,
  filename,
  mimeType,
  body,
  uploadedById,
}: CreateFeedbackAttachmentInput): Promise<FileAttachment> {
  const key = `${KEY_PREFIX[scope]}/${feedbackId}/${crypto.randomUUID()}${extensionFor(
    filename,
    mimeType,
  )}`;
  const bucket = requireEnv(
    "STORAGE_BUCKET_NAME",
    process.env.STORAGE_BUCKET_NAME,
  );

  await putObject(s3Client, { bucket, key, body, contentType: mimeType });

  const asset = await createAsset({
    key,
    bucket,
    provider: "r2",
    filename,
    mimeType,
    size: body.length,
    ...(uploadedById ? { uploadedById } : {}),
  });

  return {
    id: asset.id,
    filename: asset.filename,
    mimeType: asset.mimeType,
    size: asset.size,
    url: await getSignedAssetUrl(asset),
  };
}

export type CreateFeedbackAttachmentOutput = Awaited<
  ReturnType<typeof createFeedbackAttachment>
>;
