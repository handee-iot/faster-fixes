import { sendOrganizationInvitationEmail } from "@/server/auth/send-organization-invitation";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";

/**
 * Re-sends a pending invitation to the address it was created for. Revoked,
 * answered or expired invitations are refused: a new invitation is the way to
 * reopen those, so the invitee never gets a link that cannot work.
 */
export async function resendInvitation(
  { invitationId, userId }: { invitationId: string; userId: string },
  db: typeof prisma = prisma,
) {
  const invitation = await db.invitation.findUnique({
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

  if (!invitation) {
    throw new NotFoundError("Invitation not found.");
  }

  const membership = await db.member.findFirst({
    where: {
      organizationId: invitation.organization.id,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    throw new ForbiddenError(
      "You do not have permission to resend invitations.",
    );
  }

  if (invitation.status !== "pending") {
    throw new BadRequestError(
      "This invitation is no longer open. Send a new one instead.",
    );
  }

  if (invitation.expiresAt <= new Date()) {
    throw new BadRequestError(
      "This invitation has expired. Send a new one instead.",
    );
  }

  await sendOrganizationInvitationEmail({
    id: invitation.id,
    email: invitation.email,
    organizationName: invitation.organization.name,
    inviterName: invitation.user.name || invitation.user.email,
    role: invitation.role ?? "member",
  });

  return { sent: true as const };
}
