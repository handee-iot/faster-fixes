import { BadRequestError } from "@/server/errors/domain-errors";
import type { prisma } from "@workspace/db";
import { describe, expect, it, vi } from "vitest";
import { linkFeedbackAttachments } from "./link-feedback-attachments";

vi.mock("@/server/storage/get-signed-asset-url", () => ({
  getSignedAssetUrl: async () => "https://example.test/file",
}));

const feedbackId = "feedback_1";

function asset(
  id: string,
  key = `feedback-attachments/${feedbackId}/${id}.png`,
) {
  return {
    id,
    key,
    filename: `${id}.png`,
    mimeType: "image/png",
    size: 12,
    provider: "r2",
    bucket: "bucket",
  };
}

function fakeDb(
  assets: ReturnType<typeof asset>[],
  { taken = false, count = 0 } = {},
) {
  return {
    asset: { findMany: vi.fn().mockResolvedValue(assets) },
    feedbackAttachment: {
      findFirst: vi.fn().mockResolvedValue(taken ? { id: "existing" } : null),
      count: vi.fn().mockResolvedValue(count),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { feedbackId: string; assetId: string; position: number };
        }) => ({
          ...data,
          asset: assets.find((entry) => entry.id === data.assetId),
        }),
      ),
    },
  } as unknown as typeof prisma;
}

describe("linkFeedbackAttachments", () => {
  it("refuses an asset that was not uploaded for this feedback", async () => {
    const db = fakeDb([
      asset("asset_1", "comment-attachments/feedback_1/a.png"),
    ]);

    await expect(
      linkFeedbackAttachments({ feedbackId, assetIds: ["asset_1"] }, db),
    ).rejects.toThrow(BadRequestError);
    expect(db.feedbackAttachment.create).not.toHaveBeenCalled();
  });

  it("refuses an asset that is already attached", async () => {
    const db = fakeDb([asset("asset_1")], { taken: true });

    await expect(
      linkFeedbackAttachments({ feedbackId, assetIds: ["asset_1"] }, db),
    ).rejects.toThrow(BadRequestError);
    expect(db.feedbackAttachment.create).not.toHaveBeenCalled();
  });

  it("appends the files after the ones already on the report", async () => {
    const db = fakeDb([asset("asset_1"), asset("asset_2")], { count: 2 });

    await expect(
      linkFeedbackAttachments(
        { feedbackId, assetIds: ["asset_1", "asset_2"] },
        db,
      ),
    ).resolves.toEqual([
      {
        id: "asset_1",
        filename: "asset_1.png",
        mimeType: "image/png",
        size: 12,
        url: "https://example.test/file",
      },
      {
        id: "asset_2",
        filename: "asset_2.png",
        mimeType: "image/png",
        size: 12,
        url: "https://example.test/file",
      },
    ]);

    expect(db.feedbackAttachment.create).toHaveBeenNthCalledWith(1, {
      data: { feedbackId, assetId: "asset_1", position: 2 },
      include: { asset: true },
    });
    expect(db.feedbackAttachment.create).toHaveBeenNthCalledWith(2, {
      data: { feedbackId, assetId: "asset_2", position: 3 },
      include: { asset: true },
    });
  });
});
