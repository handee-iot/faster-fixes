// Retired 2026-10-08: the comment author type became a plain union in
// `_types/feedback-comment.ts` (ADR-0018). No runtime validation is needed
// because the services are the only writers, so the Zod enum was dropped.
export {};
