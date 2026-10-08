import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import type { CreateFeedbackColumnInput } from "./create-feedback-column.schema";
import { hasFeedbackColumnName } from "./has-feedback-column-name";

export async function createFeedbackColumn(
  {
    projectId,
    name,
    category,
    userId,
  }: CreateFeedbackColumnInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  // Editing the board's shape is a settings change, so it follows the
  // owner/admin rule the other project settings use (ADR-0017).
  const membership = await db.member.findFirst({
    where: {
      organizationId: project.organizationId,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Only owners and admins can edit board columns.");
  }

  if (await hasFeedbackColumnName({ projectId, name }, db)) {
    throw new ConflictError("A column with this name already exists.");
  }

  return db.$transaction(async (tx) => {
    // Append to the end of the category's group, not the board, so lanes keep
    // reading New → In Progress → Resolved left to right. Every project has at
    // least one column per category, so `last` always exists.
    const last = await tx.feedbackColumn.findFirstOrThrow({
      where: { projectId, category },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = last.position + 1;

    await tx.feedbackColumn.updateMany({
      where: { projectId, position: { gte: position } },
      data: { position: { increment: 1 } },
    });

    const column = await tx.feedbackColumn.create({
      data: { projectId, name, category, position },
      select: { id: true },
    });

    return { id: column.id };
  });
}
