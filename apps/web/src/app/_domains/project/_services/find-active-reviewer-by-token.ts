import { prisma } from "@workspace/db";
import crypto from "crypto";

/**
 * The active Reviewer a link token belongs to (ADR-0022), for the portal
 * hand-off that embeds the board in another app. Tokens are stored as SHA-256
 * hashes, with a plaintext fallback for tokens not yet migrated.
 */
export async function findActiveReviewerByToken(
  token: string,
  db: typeof prisma = prisma,
) {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const reviewer = await db.reviewer.findFirst({
    where: { token: hash, isActive: true },
    select: {
      id: true,
      name: true,
      projectId: true,
      project: { select: { name: true, domain: true } },
    },
  });
  if (reviewer) return reviewer;

  // Fallback: plaintext lookup for tokens not yet migrated — remove after data migration
  return db.reviewer.findFirst({
    where: { token, isActive: true },
    select: {
      id: true,
      name: true,
      projectId: true,
      project: { select: { name: true, domain: true } },
    },
  });
}

export type FindActiveReviewerByTokenOutput = Awaited<
  ReturnType<typeof findActiveReviewerByToken>
>;
