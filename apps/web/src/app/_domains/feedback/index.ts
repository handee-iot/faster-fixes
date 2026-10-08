// Public surface of the feedback domain.
export {
  FeedbackColumnCategoryEnum,
  FeedbackStatusEnum,
} from "./_helpers/feedback-status";
export type {
  FeedbackColumnCategory,
  FeedbackStatus,
} from "./_types/feedback-status";
export type { FeedbackCommentAuthorType } from "./_types/feedback-comment";
export { formatDiagnosticTrailLines } from "./_helpers/format-feedback-markdown";
