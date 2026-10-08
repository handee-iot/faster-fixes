import { sendResolvedEmailToReviewer } from "./send-resolved-email-to-reviewer";
import { inngest } from "@/server/inngest";
import { feedbackStatusChangedEvent } from "@/server/inngest/events";

export const sendFeedbackResolvedEmail = inngest.createFunction(
  {
    id: "send-feedback-resolved-email",
    retries: 3,
    concurrency: { key: "event.data.feedbackId", limit: 1 },
    triggers: [
      {
        event: feedbackStatusChangedEvent,
        if: "event.data.newStatus == 'resolved'",
      },
    ],
  },
  async ({ event }) => sendResolvedEmailToReviewer(event.data),
);
