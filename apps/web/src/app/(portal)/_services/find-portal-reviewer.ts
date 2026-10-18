import { findActiveReviewerByEmail } from "@/app/_domains/project/_services/find-active-reviewer-by-email";
import { findActiveReviewerByToken } from "@/app/_domains/project/_services/find-active-reviewer-by-token";

/**
 * The Reviewer a portal request acts as (ADR-0022): the signed-in User's email
 * first, then the hand-off token the embed's cookie carries. Either way the
 * Reviewer must be active.
 */
export async function findPortalReviewer({
  email,
  token,
}: {
  email?: string;
  token?: string;
}) {
  if (email) {
    const byEmail = await findActiveReviewerByEmail(email);
    if (byEmail) return byEmail;
  }

  if (token) return findActiveReviewerByToken(token);

  return null;
}

export type FindPortalReviewerOutput = Awaited<
  ReturnType<typeof findPortalReviewer>
>;
