import { prisma } from "@workspace/db";

/**
 * The Feedback an attachment upload names, with the Project facts its
 * authorization needs (organization for Members, domain for the widget's
 * origin check).
 */
export async function getFeedbackForAttachment(
  { feedbackId }: { feedbackId: string },
  db: typeof prisma = prisma,
) {
  return db.feedback.findUnique({
    where: { id: feedbackId },
    select: {
      id: true,
      projectId: true,
      project: { select: { organizationId: true, domain: true } },
    },
  });
}

export type GetFeedbackForAttachmentOutput = Awaited<
  ReturnType<typeof getFeedbackForAttachment>
>;
