import { prisma } from "@workspace/db";

/**
 * Reserves `count` consecutive Feedback numbers for a Project by advancing its
 * counter (ADR-0020), and returns the first of them. Numbering survives
 * deletes and never collides. A failed create leaves a gap; numbers are never
 * reused.
 */
export async function allocateFeedbackNumbers(
  projectId: string,
  count: number,
  db: typeof prisma = prisma,
) {
  const project = await db.project.update({
    where: { id: projectId },
    data: { feedbackSequence: { increment: count } },
    select: { feedbackSequence: true },
  });

  return project.feedbackSequence - count + 1;
}
