import { sendReplyEmailToReviewer } from "./send-reply-email-to-reviewer";
import { inngest } from "@/server/inngest";
import { feedbackMemberRepliedEvent } from "@/server/inngest/events";

export const sendFeedbackReplyEmail = inngest.createFunction(
  {
    id: "send-feedback-reply-email",
    retries: 3,
    concurrency: { key: "event.data.feedbackId", limit: 1 },
    triggers: [{ event: feedbackMemberRepliedEvent }],
  },
  async ({ event }) => sendReplyEmailToReviewer(event.data),
);
