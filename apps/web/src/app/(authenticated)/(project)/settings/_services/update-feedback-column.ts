import {
  ConflictError,
  ForbiddenError,
} from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import { getFeedbackColumn } from "./get-feedback-column";
import { hasFeedbackColumnName } from "./has-feedback-column-name";
import type { UpdateFeedbackColumnInput } from "./update-feedback-column.schema";

// Rename only. Category is immutable: changing it would silently re-status
// every card in the column and fan out tracker syncs (ADR-0017).
export async function updateFeedbackColumn(
  { columnId, name, userId }: UpdateFeedbackColumnInput & { userId: string },
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

  const clash = await hasFeedbackColumnName(
    { projectId: column.projectId, name, excludeColumnId: column.id },
    db,
  );

  if (clash) {
    throw new ConflictError("A column with this name already exists.");
  }

  await db.feedbackColumn.update({
    where: { id: column.id },
    data: { name },
  });

  return { id: column.id };
}
