import {
  BadRequestError,
  ForbiddenError,
} from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import type { DeleteFeedbackColumnInput } from "./delete-feedback-column.schema";
import { getFeedbackColumn } from "./get-feedback-column";

export async function deleteFeedbackColumn(
  { columnId, userId }: DeleteFeedbackColumnInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const column = await getFeedbackColumn({ columnId }, db);

  const membership = await db.member.findFirst({
    where: {
      organizationId: column.project.organizationId,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Only owners and admins can edit board columns.");
  }

  const siblings = await db.feedbackColumn.count({
    where: { projectId: column.projectId, category: column.category },
  });

  // Null columnId resolves to the first column of the status's category, so
  // each category needs one column for its cards to land in.
  if (siblings <= 1) {
    throw new BadRequestError("Each status group needs at least one column.");
  }

  // Cards keep their status; the FK's SetNull drops them into the first
  // remaining column of the same category. No status change, so no sync.
  await db.$transaction([
    db.feedbackColumn.delete({ where: { id: column.id } }),
    db.feedbackColumn.updateMany({
      where: {
        projectId: column.projectId,
        position: { gt: column.position },
      },
      data: { position: { decrement: 1 } },
    }),
  ]);

  return { id: column.id };
}
