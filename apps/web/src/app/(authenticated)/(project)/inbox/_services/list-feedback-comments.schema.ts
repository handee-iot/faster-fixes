import z from "zod";

export const ListFeedbackCommentsSchema = z.object({
  feedbackId: z.string(),
});

export type ListFeedbackCommentsInput = z.infer<
  typeof ListFeedbackCommentsSchema
>;
