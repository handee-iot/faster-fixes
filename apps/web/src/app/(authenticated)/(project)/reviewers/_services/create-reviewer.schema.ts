import z from "zod";

export const CreateReviewerSchema = z.object({
  projectId: z.string(),
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .union([
      z.literal(""),
      z.email("Invalid email address").trim().toLowerCase(),
    ])
    .optional(),
});

export type CreateReviewerInput = z.infer<typeof CreateReviewerSchema>;
