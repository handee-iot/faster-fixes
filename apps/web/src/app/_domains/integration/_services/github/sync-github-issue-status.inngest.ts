import type { FeedbackStatus } from "@/app/_domains/feedback";
import { prisma } from "@workspace/db";
import { inngest } from "@/server/inngest";
import {
  buildEvent,
  feedbackStatusChangedEvent,
  githubWebhookIssuesEvent,
} from "@/server/inngest/events";

const SYNC_LOOP_WINDOW_MS = 30_000;

export const syncGitHubIssueStatus = inngest.createFunction(
  {
    id: "sync-github-issue-status",
    retries: 3,
    concurrency: {
      key: "event.data.repoFullName + ':' + event.data.issueNumber",
      limit: 1,
    },
    triggers: [{ event: githubWebhookIssuesEvent }],
  },
  async ({ event }) => {
    const { action, issueNumber, repoFullName } = event.data;

    const issueLink = await prisma.feedbackIssueLink.findFirst({
      where: {
        issueNumber,
        projectGitHubLink: { repoFullName },
      },
    });

    if (!issueLink) return { skipped: "no_matching_issue_link" };

    // Prevent sync loop: skip if we triggered this change from the app
    if (
      issueLink.lastSyncSource === "app" &&
      issueLink.lastSyncAt &&
      Date.now() - issueLink.lastSyncAt.getTime() < SYNC_LOOP_WINDOW_MS
    ) {
      return { skipped: "sync_loop_prevention" };
    }

    let newStatus: FeedbackStatus;
    if (action === "closed") {
      newStatus = "resolved";
    } else if (action === "reopened") {
      newStatus = "in_progress";
    } else {
      return { skipped: "unhandled_action" };
    }

    await prisma.$transaction([
      // Only a real status change resets the board column (ADR-0017); a
      // same-category echo must leave the card in its lane. Inline because
      // cross-domain service imports are not permitted.
      prisma.feedback.updateMany({
        where: { id: issueLink.feedbackId, status: { not: newStatus } },
        data: { status: newStatus, columnId: null },
      }),
      prisma.feedbackIssueLink.update({
        where: { id: issueLink.id },
        data: {
          issueState: action === "closed" ? "closed" : "open",
          lastSyncSource: "github",
          lastSyncAt: new Date(),
        },
      }),
    ]);

    // Propagate to other trackers (e.g. Linear) so the feedback stays canonical.
    await inngest.send(
      buildEvent(feedbackStatusChangedEvent, {
        feedbackId: issueLink.feedbackId,
        newStatus,
        origin: "github",
        // Change originated from the GitHub issue webhook syncing back.
        actor: "tracker",
      }),
    );

    return { feedbackId: issueLink.feedbackId, newStatus };
  },
);
