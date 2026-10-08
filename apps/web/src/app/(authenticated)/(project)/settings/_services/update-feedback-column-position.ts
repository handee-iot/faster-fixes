import {
  BadRequestError,
  ForbiddenError,
} from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import { getFeedbackColumn } from "./get-feedback-column";
import type { UpdateFeedbackColumnPositionInput } from "./update-feedback-column-position.schema";

export async function updateFeedbackColumnPosition(
  {
    columnId,
    direction,
    userId,
  }: UpdateFeedbackColumnPositionInput & { userId: string },
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

  const neighbor = await db.feedbackColumn.findFirst({
    where: {
      projectId: column.projectId,
      position:
        direction === "up" ? { lt: column.position } : { gt: column.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });

  // Columns only reorder within their category so the board's left-to-right
  // flow always matches the status lifecycle (ADR-0017).
  if (!neighbor || neighbor.category !== column.category) {
    throw new BadRequestError("A column can only move within its status group.");
  }

  await db.$transaction([
    db.feedbackColumn.update({
      where: { id: column.id },
      data: { position: neighbor.position },
    }),
    db.feedbackColumn.update({
      where: { id: neighbor.id },
      data: { position: column.position },
    }),
  ]);

  return { id: column.id };
}
