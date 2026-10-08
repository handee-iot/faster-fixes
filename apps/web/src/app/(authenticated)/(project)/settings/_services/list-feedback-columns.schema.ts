import z from "zod";

export const ListFeedbackColumnsSchema = z.object({
  projectId: z.string(),
});

export type ListFeedbackColumnsInput = z.infer<
  typeof ListFeedbackColumnsSchema
>;
