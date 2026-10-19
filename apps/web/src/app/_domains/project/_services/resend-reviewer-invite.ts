import {
  buildEvent,
  reviewerInviteResendRequestedEvent,
} from "@/server/inngest/events";
import { inngest } from "@/server/inngest";
import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import crypto from "crypto";
import {
  decryptReviewerToken,
  encryptReviewerToken,
  reviewerTokenEncryptionReady,
} from "./reviewer-token-crypto";

/**
 * Re-sends a Reviewer's invite (ADR-0024). The stored token is decrypted, so
 * the links the Reviewer already has keep working. A Reviewer created before
 * the reversible copy existed gets a fresh token instead, and the caller is
 * told, so the UI can say the link changed.
 */
export async function resendReviewerInvite(
  { reviewerId, userId }: { reviewerId: string; userId: string },
  db: typeof prisma = prisma,
) {
  const reviewer = await db.reviewer.findUnique({
    where: { id: reviewerId },
    select: {
      id: true,
      email: true,
      tokenEncrypted: true,
      project: { select: { organizationId: true } },
    },
  });

  if (!reviewer) {
    throw new NotFoundError("Reviewer not found.");
  }

  const membership = await db.member.findFirst({
    where: {
      organizationId: reviewer.project.organizationId,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  const email = reviewer.email?.trim();
  if (!email) return { skipped: "no_reviewer_email" as const };

  let token: string;
  let rotated = false;

  if (reviewer.tokenEncrypted) {
    token = decryptReviewerToken(reviewer.tokenEncrypted);
  } else {
    token = crypto.randomBytes(24).toString("hex");
    rotated = true;
    await db.reviewer.update({
      where: { id: reviewer.id },
      data: {
        token: crypto.createHash("sha256").update(token).digest("hex"),
        tokenEncrypted: reviewerTokenEncryptionReady()
          ? encryptReviewerToken(token)
          : null,
      },
    });
  }

  // A mailer outage must not fail the resend; the invite function retries.
  inngest
    .send(
      buildEvent(reviewerInviteResendRequestedEvent, {
        reviewerId: reviewer.id,
        token,
      }),
    )
    .catch((error) => {
      // Silent to the caller, but visible in the logs, which is where an
      // undelivered invite is diagnosed.
      console.warn("[reviewer-invite] resend event failed", error);
    });

  return { sent: true as const, rotated };
}
