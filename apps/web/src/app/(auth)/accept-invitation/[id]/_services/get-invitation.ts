import { prisma } from "@workspace/db";

/**
 * The invitation an accept link names, with what the page shows: who invited
 * whom, into which organization, in what role, and whether it is still open.
 */
export async function getInvitation(
  { invitationId }: { invitationId: string },
  db: typeof prisma = prisma,
) {
  return db.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: { select: { id: true, name: true } },
      user: { select: { name: true, email: true } },
    },
  });
}

export type GetInvitationOutput = Awaited<ReturnType<typeof getInvitation>>;
