import { mailer } from "@/lib/mailer/client";
import { SENDER_FROM } from "@/lib/mailer/constants";
import { ReviewerInviteEmail } from "@/lib/mailer/templates/reviewer-invite";
import { getAppUrl } from "@/utils/url/get-app-url";
import { render } from "@react-email/components";
import { prisma } from "@workspace/db";
import { createElement } from "react";

/**
 * Emails a new Reviewer their board link and the link that arms the widget on
 * their site (ADR-0023). Skips silently when the Reviewer is gone or has no
 * recorded email, so creating one never fails on a missing address.
 */
export async function sendReviewerInviteEmail(
  { reviewerId, token }: { reviewerId: string; token: string },
  db: typeof prisma = prisma,
) {
  const reviewer = await db.reviewer.findUnique({
    where: { id: reviewerId },
    select: {
      name: true,
      email: true,
      project: { select: { name: true, domain: true } },
    },
  });

  if (!reviewer) return { skipped: "reviewer_not_found" as const };

  const email = reviewer.email?.trim();
  if (!email) return { skipped: "no_reviewer_email" as const };

  // createElement (not JSX) so this file stays .ts, matching the other
  // email-sending services.
  const body = await render(
    createElement(ReviewerInviteEmail, {
      reviewerName: reviewer.name,
      projectName: reviewer.project.name,
      boardUrl: `${getAppUrl()}/portal/handoff?token=${encodeURIComponent(token)}`,
      feedbackUrl: `https://${reviewer.project.domain}?ff_token=${encodeURIComponent(token)}`,
    }),
  );

  await mailer.emails.send({
    from: SENDER_FROM,
    to: email,
    subject: `You're on the ${reviewer.project.name} feedback board`,
    body,
  });

  console.info(
    `[reviewer-invite] sent reviewer=${reviewerId} project=${reviewer.project.name}`,
  );

  return { sent: true as const };
}
