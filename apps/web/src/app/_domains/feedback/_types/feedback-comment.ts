// Who wrote a Feedback comment (ADR-0018): the Feedback's Reviewer through the
// Widget, or a Member through the dashboard. Exactly one of reviewerId /
// memberId is set on the row to match. The services are the only writers, so a
// plain union carries the contract without a runtime validator.
export type FeedbackCommentAuthorType = "reviewer" | "member";
