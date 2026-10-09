import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { prisma } from "@workspace/db";

/**
 * The board a Reviewer sees (ADR-0021): their Project's columns and Feedback
 * (archived hidden), newest first, each with its number and a signed
 * screenshot URL. The caller has already resolved the Reviewer.
 */
export async function listPortalBoard(
  { projectId }: { projectId: string },
  db: typeof prisma = prisma,
) {
  const [columns, feedback] = await Promise.all([
    db.feedbackColumn.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      select: { id: true, name: true, category: true },
    }),
    db.feedback.findMany({
      where: { projectId, status: { not: "closed" } },
      orderBy: { createdAt: "desc" },
      // Keep the heavy Diagnostic Trail out of the board read.
      omit: { diagnosticTrail: true },
      include: {
        reviewer: { select: { id: true, name: true } },
        screenshot: { select: { key: true, provider: true, bucket: true } },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  return {
    columns,
    feedback: await Promise.all(
      feedback.map(async (f) => ({
        id: f.id,
        number: f.number,
        status: f.status,
        columnId: f.columnId,
        comment: f.comment,
        pageUrl: f.pageUrl,
        createdAt: f.createdAt,
        reviewer: f.reviewer,
        commentCount: f._count.comments,
        screenshotUrl: f.screenshot
          ? await getSignedAssetUrl(f.screenshot)
          : null,
      })),
    ),
  };
}

export type ListPortalBoardOutput = Awaited<ReturnType<typeof listPortalBoard>>;
