import { createReviewerComment } from "@/app/_domains/feedback/_services/create-reviewer-comment";

type CreateFeedbackCommentInput = {
  projectId: string;
  feedbackId: string;
  reviewerId: string;
  body: string;
  attachmentIds?: readonly string[];
};

/**
 * The widget API's reviewer reply (ADR-0018); the portal shares the domain
 * service behind it.
 */
export async function createFeedbackComment({
  projectId,
  feedbackId,
  reviewerId,
  body,
  attachmentIds,
}: CreateFeedbackCommentInput) {
  return createReviewerComment({
    projectId,
    feedbackId,
    reviewerId,
    body,
    attachmentIds,
  });
}

export type CreateFeedbackCommentOutput = Awaited<
  ReturnType<typeof createFeedbackComment>
>;
