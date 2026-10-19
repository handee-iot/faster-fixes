import { buildEvent, reviewerCreatedEvent } from "@/server/inngest/events";
import { inngest } from "@/server/inngest";
import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import crypto from "crypto";
import type { CreateReviewerInput } from "./create-reviewer.schema";

export async function createReviewer(
  { projectId, name, email, userId }: CreateReviewerInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const project = await db.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  // Membership in the Project's Organization needs the loaded Project, so the
  // denial lives here rather than at the transport edge.
  const membership = await db.member.findFirst({
    where: {
      organizationId: project.organizationId,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // A blank field means "no notifications", never an empty address.
  const reviewerEmail = email === undefined || email === "" ? null : email;

  const reviewer = await db.reviewer.create({
    data: {
      projectId,
      name,
      email: reviewerEmail,
      token: tokenHash,
    },
  });

  // The invite carries the raw token, which exists only here; a mailer outage
  // must not fail the creation, so it goes out as an event.
  if (reviewerEmail) {
    inngest
      .send(
        buildEvent(reviewerCreatedEvent, { reviewerId: reviewer.id, token }),
      )
      .catch(() => {});
  }

  // Return raw token once — only the hash is persisted
  return {
    id: reviewer.id,
    name: reviewer.name,
    token,
    shareUrl: `https://${project.domain}?ff_token=${token}`,
  };
}
