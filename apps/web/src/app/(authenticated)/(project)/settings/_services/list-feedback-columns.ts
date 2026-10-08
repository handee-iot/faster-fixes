import type { FeedbackColumnCategory } from "@/app/_domains/feedback";
import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import type { ListFeedbackColumnsInput } from "./list-feedback-columns.schema";

export async function listFeedbackColumns(
  { projectId, userId }: ListFeedbackColumnsInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  // Reading columns is open to any member (the board needs them); editing the
  // board's shape follows the owner/admin rule the other settings use (ADR-0017).
  const membership = await db.member.findFirst({
    where: { organizationId: project.organizationId, userId },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  const columns = await db.feedbackColumn.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
    select: { id: true, name: true, category: true, position: true },
  });

  return columns.map((column) => ({
    ...column,
    category: column.category as FeedbackColumnCategory,
  }));
}

export type ListFeedbackColumnsOutput = Awaited<
  ReturnType<typeof listFeedbackColumns>
>;
