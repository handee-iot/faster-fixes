import { pageLabel } from "@/app/_domains/feedback/_helpers/page-label";
import { mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import { FeedbackResolvedEmail } from "@/lib/mailer/templates/feedback-resolved";
import { render } from "@react-email/components";
import { prisma } from "@workspace/db";
import { createElement } from "react";

/**
 * Emails the Reviewer when their Feedback is resolved (ADR-0019). Skips
 * silently when the Feedback is gone or the Reviewer has no recorded email,
 * so a resolve never fails on a missing address.
 */
export async function sendResolvedEmailToReviewer(
  { feedbackId }: { feedbackId: string },
  db: typeof prisma = prisma,
) {
  const feedback = await db.feedback.findUnique({
    where: { id: feedbackId },
    select: {
      comment: true,
      pageUrl: true,
      reviewer: { select: { name: true, email: true } },
    },
  });

  if (!feedback) return { skipped: "feedback_not_found" as const };

  const email = feedback.reviewer.email?.trim();
  if (!email) return { skipped: "no_reviewer_email" as const };

  // createElement (not JSX) so this file stays .ts, matching the other
  // email-sending services.
  const body = await render(
    createElement(FeedbackResolvedEmail, {
      reviewerName: feedback.reviewer.name,
      comment: feedback.comment,
      pageLabel: pageLabel(feedback.pageUrl),
    }),
  );

  await mailer.emails.send({
    from: SENDER_EMAIL,
    to: email,
    subject: "Your feedback has been resolved",
    body,
  });

  return { sent: true as const };
}
