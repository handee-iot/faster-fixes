import { createReviewerComment } from "@/app/_domains/feedback/_services/create-reviewer-comment";

type CreateFeedbackCommentInput = {
  projectId: string;
  feedbackId: string;
  reviewerId: string;
  body: string;
};

/**
 * The widget API's reviewer reply (ADR-0018); the portal shares the domain
 * service behind it.
 */
export async function createFeedbackComment(input: CreateFeedbackCommentInput) {
  return createReviewerComment(input);
}

export type CreateFeedbackCommentOutput = Awaited<
  ReturnType<typeof createFeedbackComment>
>;
