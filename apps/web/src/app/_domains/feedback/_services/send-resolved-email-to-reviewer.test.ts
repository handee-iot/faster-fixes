import type { Mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn<Mailer["emails"]["send"]>();

// The real client imports `server-only` and builds a provider from the
// environment, neither of which a node test can load.
vi.mock("@/lib/mailer/client", () => ({ mailer: { emails: { send } } }));
vi.mock("@workspace/db", () => ({ prisma: {} }));

const { sendResolvedEmailToReviewer } =
  await import("./send-resolved-email-to-reviewer");

type FeedbackRow = {
  comment: string;
  pageUrl: string;
  reviewer: { name: string; email: string | null };
};

function databaseWith(feedback: FeedbackRow | null) {
  return {
    feedback: { findUnique: async () => feedback },
  } as unknown as Parameters<typeof sendResolvedEmailToReviewer>[1];
}

const feedback: FeedbackRow = {
  comment: "The button overlaps the text",
  pageUrl: "https://example.com/pricing?plan=pro#faq",
  reviewer: { name: "Marie", email: "marie@example.com" },
};

describe("sendResolvedEmailToReviewer", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ success: true, message: "" });
  });

  it("skips a feedback that no longer exists", async () => {
    await expect(
      sendResolvedEmailToReviewer({ feedbackId: "gone" }, databaseWith(null)),
    ).resolves.toEqual({ skipped: "feedback_not_found" });

    expect(send).not.toHaveBeenCalled();
  });

  it("skips a reviewer with no recorded email", async () => {
    const db = databaseWith({
      ...feedback,
      reviewer: { name: "Marie", email: null },
    });

    await expect(
      sendResolvedEmailToReviewer({ feedbackId: "feedback_1" }, db),
    ).resolves.toEqual({ skipped: "no_reviewer_email" });

    expect(send).not.toHaveBeenCalled();
  });

  it("treats a blank email as no email", async () => {
    const db = databaseWith({
      ...feedback,
      reviewer: { name: "Marie", email: "   " },
    });

    await expect(
      sendResolvedEmailToReviewer({ feedbackId: "feedback_1" }, db),
    ).resolves.toEqual({ skipped: "no_reviewer_email" });

    expect(send).not.toHaveBeenCalled();
  });

  it("emails the reviewer the comment and a short page label", async () => {
    await expect(
      sendResolvedEmailToReviewer(
        { feedbackId: "feedback_1" },
        databaseWith(feedback),
      ),
    ).resolves.toEqual({ sent: true });

    expect(send).toHaveBeenCalledTimes(1);
    const options = send.mock.calls[0]![0];
    expect(options).toMatchObject({
      from: SENDER_EMAIL,
      to: "marie@example.com",
      subject: "Your feedback has been resolved",
    });
    expect(options.body).toContain("Marie");
    expect(options.body).toContain("The button overlaps the text");
    expect(options.body).toContain("example.com/pricing");
    expect(options.body).not.toContain("plan=pro");
  });
});
