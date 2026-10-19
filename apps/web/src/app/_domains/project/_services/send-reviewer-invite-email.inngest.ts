import { sendReviewerInviteEmail } from "./send-reviewer-invite-email";
import { inngest } from "@/server/inngest";
import {
  reviewerCreatedEvent,
  reviewerInviteResendRequestedEvent,
} from "@/server/inngest/events";

export const sendReviewerInvite = inngest.createFunction(
  {
    id: "send-reviewer-invite-email",
    retries: 3,
    concurrency: { key: "event.data.reviewerId", limit: 1 },
    triggers: [
      { event: reviewerCreatedEvent },
      { event: reviewerInviteResendRequestedEvent },
    ],
  },
  async ({ event }) => sendReviewerInviteEmail(event.data),
);
