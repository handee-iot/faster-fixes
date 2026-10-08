import { FeedbackColumnCategoryEnum } from "@/app/_domains/feedback";
import z from "zod";
import { FeedbackColumnNameSchema } from "./feedback-column-name.schema";

export const CreateFeedbackColumnSchema = z.object({
  projectId: z.string(),
  name: FeedbackColumnNameSchema,
  category: FeedbackColumnCategoryEnum,
});

export type CreateFeedbackColumnInput = z.infer<
  typeof CreateFeedbackColumnSchema
>;
