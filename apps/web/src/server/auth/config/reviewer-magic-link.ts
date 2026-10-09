import "server-only";

import { mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import { ReviewerMagicLinkEmail } from "@/lib/mailer/templates/reviewer-magic-link";
import { render } from "@react-email/components";
import { prisma } from "@workspace/db";
import { createElement } from "react";

/**
 * Emails a sign-in link to an active Reviewer (ADR-0021). Anyone else gets
 * silence, so the endpoint cannot be used to enumerate reviewer addresses.
 */
export async function sendReviewerMagicLink(
  { email, url }: { email: string; url: string },
  db: typeof prisma = prisma,
) {
  const reviewer = await db.reviewer.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { name: true, project: { select: { name: true } } },
  });

  if (!reviewer) return { skipped: "not_a_reviewer" as const };

  const body = await render(
    createElement(ReviewerMagicLinkEmail, {
      reviewerName: reviewer.name,
      projectName: reviewer.project.name,
      url,
    }),
  );

  await mailer.emails.send({
    from: SENDER_EMAIL,
    to: email.toLowerCase().trim(),
    subject: `Sign in to ${reviewer.project.name}`,
    body,
  });

  return { sent: true as const };
}
