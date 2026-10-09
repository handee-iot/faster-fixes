import z from "zod";

export const CreatePortalCommentSchema = z.object({
  feedbackId: z.string(),
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(4000, "Messages are limited to 4000 characters."),
});

export type CreatePortalCommentInput = z.infer<
  typeof CreatePortalCommentSchema
>;
