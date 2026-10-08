import { feedbackStatusFromLinearStateType } from "../../_helpers/linear/state-mapping";
import type { LinearStateType } from "../../_helpers/linear/state-mapping";
import { prisma } from "@workspace/db";
import { inngest } from "@/server/inngest";
import {
  buildEvent,
  feedbackStatusChangedEvent,
  linearWebhookIssueEvent,
} from "@/server/inngest/events";

const SYNC_LOOP_WINDOW_MS = 60_000;

type IssueWebhookData = {
  id: string;
  state?: { id: string; type: string; name?: string };
  stateId?: string;
};

export const syncLinearIssueStatus = inngest.createFunction(
  {
    id: "sync-linear-issue-status",
    retries: 3,
    concurrency: { key: "event.data.issue.id", limit: 1 },
    triggers: [{ event: linearWebhookIssueEvent }],
  },
  async ({ event }) => {
    const issueData = event.data.issue as IssueWebhookData | undefined;
    if (!issueData?.id) return { skipped: "no_issue_data" };

    const issueLink = await prisma.feedbackLinearIssueLink.findFirst({
      where: { issueId: issueData.id },
    });

    if (!issueLink) return { skipped: "no_matching_issue_link" };

    // Loop prevention: if the app just pushed to Linear within the window, skip
    if (
      issueLink.lastSyncSource === "app" &&
      issueLink.lastSyncAt &&
      Date.now() - issueLink.lastSyncAt.getTime() < SYNC_LOOP_WINDOW_MS
    ) {
      return { skipped: "sync_loop_prevention" };
    }

    const stateType = issueData.state?.type as LinearStateType | undefined;
    const stateId = issueData.state?.id ?? issueData.stateId;
    if (!stateType || !stateId) {
      return { skipped: "no_state_in_payload" };
    }

    const newStatus = feedbackStatusFromLinearStateType(stateType);

    await prisma.$transaction([
      // Only a real status change resets the board column (ADR-0017); a
      // same-category echo must leave the card in its lane. Inline because
      // cross-domain service imports are not permitted.
      prisma.feedback.updateMany({
        where: { id: issueLink.feedbackId, status: { not: newStatus } },
        data: { status: newStatus, columnId: null },
      }),
      prisma.feedbackLinearIssueLink.update({
        where: { id: issueLink.id },
        data: {
          issueStateId: stateId,
          issueStateType: stateType,
          lastSyncSource: "linear",
          lastSyncAt: new Date(),
        },
      }),
    ]);

    // Propagate to other trackers (e.g. GitHub) so the feedback stays canonical.
    await inngest.send(
      buildEvent(feedbackStatusChangedEvent, {
        feedbackId: issueLink.feedbackId,
        newStatus,
        origin: "linear",
        // Change originated from the Linear issue webhook syncing back.
        actor: "tracker",
      }),
    );

    return { feedbackId: issueLink.feedbackId, newStatus };
  },
);
