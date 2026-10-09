import type { Mailer } from "@/lib/mailer/client";
import { SENDER_EMAIL } from "@/lib/mailer/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn<Mailer["emails"]["send"]>();

// The real client imports `server-only` and builds a provider from the
// environment, neither of which a node test can load.
vi.mock("@/lib/mailer/client", () => ({ mailer: { emails: { send } } }));
vi.mock("@workspace/db", () => ({ prisma: {} }));

const { sendReviewerMagicLink } = await import("./reviewer-magic-link");

type ReviewerRow = {
  id: string;
  name: string;
  projectId: string;
  project: { name: string };
};

function databaseWith(reviewer: ReviewerRow | null) {
  return {
    reviewer: { findFirst: async () => reviewer },
  } as unknown as Parameters<typeof sendReviewerMagicLink>[1];
}

describe("sendReviewerMagicLink", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ success: true, message: "" });
  });

  it("stays silent for an address that is not an active reviewer", async () => {
    await expect(
      sendReviewerMagicLink(
        { email: "stranger@example.com", url: "https://example.com/verify" },
        databaseWith(null),
      ),
    ).resolves.toEqual({ skipped: "not_a_reviewer" });

    expect(send).not.toHaveBeenCalled();
  });

  it("emails the link and names the project", async () => {
    const db = databaseWith({
      id: "reviewer_1",
      name: "Marie",
      projectId: "project_1",
      project: { name: "Blueberry Hill Farm" },
    });

    await expect(
      sendReviewerMagicLink(
        { email: " Marie@Example.com ", url: "https://example.com/verify" },
        db,
      ),
    ).resolves.toEqual({ sent: true });

    expect(send).toHaveBeenCalledTimes(1);
    const options = send.mock.calls[0]![0];
    expect(options).toMatchObject({
      from: SENDER_EMAIL,
      to: "marie@example.com",
      subject: "Sign in to Blueberry Hill Farm",
    });
    expect(options.body).toContain("Marie");
    expect(options.body).toContain("https://example.com/verify");
  });
});
