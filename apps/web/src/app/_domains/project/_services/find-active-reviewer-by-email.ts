import { prisma } from "@workspace/db";

/**
 * The active Reviewer a sign-in email belongs to (ADR-0021), oldest first so
 * a person reviewing two Projects lands somewhere stable.
 */
export async function findActiveReviewerByEmail(
  email: string,
  db: typeof prisma = prisma,
) {
  return db.reviewer.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      projectId: true,
      project: { select: { name: true } },
    },
  });
}

export type FindActiveReviewerByEmailOutput = Awaited<
  ReturnType<typeof findActiveReviewerByEmail>
>;
