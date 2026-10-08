import { prisma } from "@workspace/db";

type FeedbackColumnNameLookup = {
  projectId: string;
  name: string;
  excludeColumnId?: string;
};

// Column names are unique per Project, case-insensitive (ADR-0017).
export async function hasFeedbackColumnName(
  { projectId, name, excludeColumnId }: FeedbackColumnNameLookup,
  db: typeof prisma = prisma,
) {
  const clash = await db.feedbackColumn.findFirst({
    where: {
      projectId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeColumnId && { id: { not: excludeColumnId } }),
    },
    select: { id: true },
  });

  return clash !== null;
}

export type HasFeedbackColumnNameOutput = Awaited<
  ReturnType<typeof hasFeedbackColumnName>
>;
