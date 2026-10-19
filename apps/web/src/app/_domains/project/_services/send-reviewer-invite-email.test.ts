import type { Mailer } from "@/lib/mailer/client";
import { SENDER_FROM } from "@/lib/mailer/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn<Mailer["emails"]["send"]>();

// The real client imports `server-only` and builds a provider from the
// environment, neither of which a node test can load.
vi.mock("@/lib/mailer/client", () => ({ mailer: { emails: { send } } }));
vi.mock("@workspace/db", () => ({ prisma: {} }));

const { sendReviewerInviteEmail } =
  await import("./send-reviewer-invite-email");

type ReviewerRow = {
  name: string;
  email: string | null;
  project: { name: string; domain: string };
};

function databaseWith(reviewer: ReviewerRow | null) {
  return {
    reviewer: { findUnique: async () => reviewer },
  } as unknown as Parameters<typeof sendReviewerInviteEmail>[1];
}

const reviewer: ReviewerRow = {
  name: "Marie",
  email: "marie@example.com",
  project: { name: "Blueberry Hill Farm", domain: "blueberryhill.example" },
};

describe("sendReviewerInviteEmail", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ success: true, message: "" });
    vi.stubEnv("BASE_URL", "https://faster-fixes.handee.co.za");
  });

  it("skips a reviewer that no longer exists", async () => {
    await expect(
      sendReviewerInviteEmail(
        { reviewerId: "gone", token: "tok" },
        databaseWith(null),
      ),
    ).resolves.toEqual({ skipped: "reviewer_not_found" });

    expect(send).not.toHaveBeenCalled();
  });

  it("skips a reviewer with no recorded email", async () => {
    const db = databaseWith({ ...reviewer, email: null });

    await expect(
      sendReviewerInviteEmail({ reviewerId: "r1", token: "tok" }, db),
    ).resolves.toEqual({ skipped: "no_reviewer_email" });

    expect(send).not.toHaveBeenCalled();
  });

  it("emails the board link and the widget link", async () => {
    await expect(
      sendReviewerInviteEmail(
        { reviewerId: "r1", token: "tok_abc" },
        databaseWith(reviewer),
      ),
    ).resolves.toEqual({ sent: true });

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0]![0];
    expect(message.from).toBe(SENDER_FROM);
    expect(message.to).toBe("marie@example.com");
    expect(message.subject).toBe(
      "You're on the Blueberry Hill Farm feedback board",
    );
    expect(message.body).toContain(
      "https://faster-fixes.handee.co.za/portal/handoff?token=tok_abc",
    );
    expect(message.body).toContain(
      "https://blueberryhill.example?ff_token=tok_abc",
    );
  });
});
