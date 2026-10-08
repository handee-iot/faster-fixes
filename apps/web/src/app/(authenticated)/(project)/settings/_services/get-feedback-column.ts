import { NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";

type GetFeedbackColumnInput = { columnId: string };

// Loads a column with its Project's Organization so callers can run the
// membership denial without a second lookup (ADR-0017).
export async function getFeedbackColumn(
  { columnId }: GetFeedbackColumnInput,
  db: typeof prisma = prisma,
) {
  const column = await db.feedbackColumn.findUnique({
    where: { id: columnId },
    include: { project: { select: { organizationId: true } } },
  });

  if (!column) {
    throw new NotFoundError("Column not found.");
  }

  return column;
}

export type GetFeedbackColumnOutput = Awaited<
  ReturnType<typeof getFeedbackColumn>
>;
