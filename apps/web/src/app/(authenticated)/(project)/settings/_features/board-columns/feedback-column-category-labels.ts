import type { FeedbackColumnCategory } from "@/app/_domains/feedback";

export const FEEDBACK_COLUMN_CATEGORY_LABELS: Record<
  FeedbackColumnCategory,
  string
> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
};
