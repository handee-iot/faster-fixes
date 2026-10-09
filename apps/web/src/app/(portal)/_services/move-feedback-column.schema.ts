import z from "zod";

export const MoveFeedbackColumnSchema = z.object({
  feedbackId: z.string(),
  columnId: z.string(),
});

export type MoveFeedbackColumnInput = z.infer<typeof MoveFeedbackColumnSchema>;
