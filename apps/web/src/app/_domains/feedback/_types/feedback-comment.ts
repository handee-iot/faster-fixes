import type { z } from "zod";

import type { FeedbackCommentAuthorTypeEnum } from "../_helpers/feedback-comment";

export type FeedbackCommentAuthorType = z.infer<
  typeof FeedbackCommentAuthorTypeEnum
>;
