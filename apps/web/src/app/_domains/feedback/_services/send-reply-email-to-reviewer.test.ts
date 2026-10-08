import type { Mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn<Mailer["emails"]["send"]>();

// The real client imports `server-only` and builds a provider from the
// environment, neither of which a node test can load.
vi.mock("@/lib/mailer/client", () => ({ mailer: { emails: { send } } }));
vi.mock("@workspace/db", () => ({ prisma: {} }));

const { sendReplyEmailToReviewer } =
  await import("./send-reply-email-to-reviewer");

type CommentRow = {
  body: string;
  authorType: string;
  feedback: {
    pageUrl: string;
    reviewer: { name: string; email: string | null };
  };
};

function databaseWith(comment: CommentRow | null) {
  return {
    feedbackComment: { findUnique: async () => comment },
  } as unknown as Parameters<typeof sendReplyEmailToReviewer>[1];
}

const comment: CommentRow = {
  body: "We shipped the fix in this release.",
  authorType: "member",
  feedback: {
    pageUrl: "https://example.com/pricing?plan=pro#faq",
    reviewer: { name: "Marie", email: "marie@example.com" },
  },
};

describe("sendReplyEmailToReviewer", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ success: true, message: "" });
  });

  it("skips a comment that no longer exists", async () => {
    await expect(
      sendReplyEmailToReviewer({ commentId: "gone" }, databaseWith(null)),
    ).resolves.toEqual({ skipped: "comment_not_found" });

    expect(send).not.toHaveBeenCalled();
  });

  it("skips the reviewer's own reply", async () => {
    const db = databaseWith({ ...comment, authorType: "reviewer" });

    await expect(
      sendReplyEmailToReviewer({ commentId: "comment_1" }, db),
    ).resolves.toEqual({ skipped: "not_a_member_comment" });

    expect(send).not.toHaveBeenCalled();
  });

  it("skips a reviewer with no recorded email", async () => {
    const db = databaseWith({
      ...comment,
      feedback: {
        ...comment.feedback,
        reviewer: { name: "Marie", email: null },
      },
    });

    await expect(
      sendReplyEmailToReviewer({ commentId: "comment_1" }, db),
    ).resolves.toEqual({ skipped: "no_reviewer_email" });

    expect(send).not.toHaveBeenCalled();
  });

  it("emails the reviewer the reply and a short page label", async () => {
    await expect(
      sendReplyEmailToReviewer(
        { commentId: "comment_1" },
        databaseWith(comment),
      ),
    ).resolves.toEqual({ sent: true });

    expect(send).toHaveBeenCalledTimes(1);
    const options = send.mock.calls[0]![0];
    expect(options).toMatchObject({
      from: SENDER_EMAIL,
      to: "marie@example.com",
      subject: "New reply to your feedback",
    });
    expect(options.body).toContain("Marie");
    expect(options.body).toContain("We shipped the fix in this release.");
    expect(options.body).toContain("example.com/pricing");
    expect(options.body).not.toContain("plan=pro");
  });
});
