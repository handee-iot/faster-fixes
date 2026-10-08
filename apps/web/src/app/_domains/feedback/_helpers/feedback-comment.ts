import { z } from "zod";

// Who wrote a Feedback comment (ADR-0018): the Feedback's Reviewer through the
// Widget, or a Member through the dashboard. Exactly one of reviewerId /
// memberId is set on the row to match.
export const FeedbackCommentAuthorTypeEnum = z.enum(["reviewer", "member"]);
