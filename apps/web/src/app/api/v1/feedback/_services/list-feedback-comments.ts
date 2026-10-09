import { listReviewerComments } from "@/app/_domains/feedback/_services/list-reviewer-comments";

type ListFeedbackCommentsInput = {
  projectId: string;
  feedbackId: string;
};

/**
 * The widget API's thread read (ADR-0021); the portal shares the domain
 * service behind it.
 */
export async function listFeedbackComments(input: ListFeedbackCommentsInput) {
  return listReviewerComments(input);
}

export type ListFeedbackCommentsOutput = Awaited<
  ReturnType<typeof listFeedbackComments>
>;
