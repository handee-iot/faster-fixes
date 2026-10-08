import type { z } from "zod";

import type {
  FeedbackColumnCategoryEnum,
  FeedbackStatusEnum,
} from "../_helpers/feedback-status";

export type FeedbackStatus = z.infer<typeof FeedbackStatusEnum>;

export type FeedbackColumnCategory = z.infer<typeof FeedbackColumnCategoryEnum>;
