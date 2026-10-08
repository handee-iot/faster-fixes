import { pageLabel } from "@/app/_domains/feedback/_helpers/page-label";
import { mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import { FeedbackReplyEmail } from "@/lib/mailer/templates/feedback-reply";
import { render } from "@react-email/components";
import { prisma } from "@workspace/db";
import { createElement } from "react";

/**
 * Emails the Reviewer when a Member replies to their Feedback (ADR-0019).
 * Skips silently when the comment is gone, is not a Member's, or the Reviewer
 * has no recorded email.
 */
export async function sendReplyEmailToReviewer(
  { commentId }: { commentId: string },
  db: typeof prisma = prisma,
) {
  const comment = await db.feedbackComment.findUnique({
    where: { id: commentId },
    select: {
      body: true,
      authorType: true,
      feedback: {
        select: {
          pageUrl: true,
          reviewer: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!comment) return { skipped: "comment_not_found" as const };

  // The Reviewer already knows about their own reply.
  if (comment.authorType !== "member") {
    return { skipped: "not_a_member_comment" as const };
  }

  const email = comment.feedback.reviewer.email?.trim();
  if (!email) return { skipped: "no_reviewer_email" as const };

  const body = await render(
    createElement(FeedbackReplyEmail, {
      reviewerName: comment.feedback.reviewer.name,
      reply: comment.body,
      pageLabel: pageLabel(comment.feedback.pageUrl),
    }),
  );

  await mailer.emails.send({
    from: SENDER_EMAIL,
    to: email,
    subject: "New reply to your feedback",
    body,
  });

  return { sent: true as const };
}
