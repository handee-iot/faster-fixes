import z from "zod";

export const ResendReviewerInviteSchema = z.object({
  reviewerId: z.string(),
});

export type ResendReviewerInviteInput = z.infer<
  typeof ResendReviewerInviteSchema
>;
