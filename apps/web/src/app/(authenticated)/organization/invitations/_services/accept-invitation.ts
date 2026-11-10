import { auth } from "@/server/auth";
import { BadRequestError } from "@/server/errors/domain-errors";
import { APIError } from "better-auth/api";
import { prisma } from "@workspace/db";
import type { AcceptInvitationInput } from "./accept-invitation.schema";

export async function acceptInvitation(
  { invitationId, headers }: AcceptInvitationInput & { headers: Headers },
  db: typeof prisma = prisma,
) {
  try {
    await auth.api.acceptInvitation({
      body: { invitationId },
      headers,
    });

    // Joining an existing organization is not a new workspace: the onboarding
    // wizard (create a project, install the widget) would only be in the way.
    const session = await auth.api.getSession({ headers });
    if (session) {
      await db.user.update({
        where: { id: session.user.id },
        data: { onboardingCompleted: true },
      });
    }

    return { success: true };
  } catch (error) {
    // Better Auth reports an expired, already answered or foreign invitation as
    // a 4xx APIError whose message is the copy the toast shows. Anything else is
    // an outage and keeps its 500 masking.
    if (error instanceof APIError && error.statusCode < 500) {
      throw new BadRequestError(error.message);
    }

    throw error;
  }
}
