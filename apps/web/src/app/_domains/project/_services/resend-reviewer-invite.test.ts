import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send =
  vi.fn<
    (event: {
      name: string;
      data: { reviewerId: string; token: string };
    }) => Promise<void>
  >();
send.mockResolvedValue(undefined);

// The real client reads env keys and talks to Inngest; the service's job is
// the payload it hands over.
vi.mock("@/server/inngest", () => ({ inngest: { send } }));

const { resendReviewerInvite } = await import("./resend-reviewer-invite");
const { encryptReviewerToken, reviewerTokenEncryptionReady } =
  await import("./reviewer-token-crypto");

type FakeDb = NonNullable<Parameters<typeof resendReviewerInvite>[1]>;

type ReviewerRow = {
  id: string;
  email: string | null;
  tokenEncrypted: string | null;
  project: { organizationId: string };
};

function fakeDb(
  reviewer: ReviewerRow | null,
  membership: { id: string } | null,
) {
  return {
    reviewer: {
      findUnique: vi.fn().mockResolvedValue(reviewer),
      update: vi.fn().mockResolvedValue({}),
    },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
  } as unknown as FakeDb;
}

const KEY = "a".repeat(64);
const input = { reviewerId: "reviewer_1", userId: "user_1" };

describe("resendReviewerInvite", () => {
  beforeEach(() => {
    send.mockClear();
    vi.unstubAllEnvs();
    vi.stubEnv("REVIEWER_TOKEN_ENCRYPTION_KEY", KEY);
  });

  it("reports an unknown reviewer as not found", async () => {
    await expect(
      resendReviewerInvite(input, fakeDb(null, { id: "member_1" })),
    ).rejects.toThrow(new NotFoundError("Reviewer not found."));
  });

  it("refuses a caller who is not an owner or an admin of the organization", async () => {
    const db = fakeDb(
      {
        id: "reviewer_1",
        email: "marie@example.com",
        tokenEncrypted: null,
        project: { organizationId: "org_1" },
      },
      null,
    );

    await expect(resendReviewerInvite(input, db)).rejects.toThrow(
      new ForbiddenError("Access denied."),
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("skips a reviewer with no email", async () => {
    const db = fakeDb(
      {
        id: "reviewer_1",
        email: null,
        tokenEncrypted: null,
        project: { organizationId: "org_1" },
      },
      { id: "member_1" },
    );

    await expect(resendReviewerInvite(input, db)).resolves.toEqual({
      skipped: "no_reviewer_email",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("reuses the stored token so existing links keep working", async () => {
    expect(reviewerTokenEncryptionReady()).toBe(true);
    const db = fakeDb(
      {
        id: "reviewer_1",
        email: "marie@example.com",
        tokenEncrypted: encryptReviewerToken("tok_existing"),
        project: { organizationId: "org_1" },
      },
      { id: "member_1" },
    );

    await expect(resendReviewerInvite(input, db)).resolves.toEqual({
      sent: true,
      rotated: false,
    });

    expect(db.reviewer.update).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({
      name: "reviewer/invite-resend-requested",
      data: { reviewerId: "reviewer_1", token: "tok_existing" },
    });
  });

  it("issues a fresh token for a reviewer that predates the reversible copy", async () => {
    const db = fakeDb(
      {
        id: "reviewer_1",
        email: "marie@example.com",
        tokenEncrypted: null,
        project: { organizationId: "org_1" },
      },
      { id: "member_1" },
    );

    await expect(resendReviewerInvite(input, db)).resolves.toEqual({
      sent: true,
      rotated: true,
    });

    const update = vi.mocked(db.reviewer.update).mock.calls[0]![0] as {
      data: { token: string };
    };
    const sentToken = send.mock.calls[0]![0].data.token;
    expect(update.data.token).toBe(
      crypto.createHash("sha256").update(sentToken).digest("hex"),
    );
    expect(sentToken).not.toBe("");
  });
});
