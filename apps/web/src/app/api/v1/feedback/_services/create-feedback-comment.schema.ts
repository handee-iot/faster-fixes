import { z } from "zod";

export const CreateFeedbackCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(4000, "Messages are limited to 4000 characters."),
});

export type CreateFeedbackCommentInput = z.infer<
  typeof CreateFeedbackCommentSchema
>;
