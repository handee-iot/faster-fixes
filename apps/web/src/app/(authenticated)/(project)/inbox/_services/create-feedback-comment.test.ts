import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";

import { createFeedbackComment } from "./create-feedback-comment";

type FakeDb = NonNullable<Parameters<typeof createFeedbackComment>[1]>;

const input = {
  feedbackId: "feedback_1",
  body: "Looking into it.",
  userId: "user_1",
};

function fakeDb({
  feedback = { id: "feedback_1", project: { organizationId: "org_1" } },
  membership = {
    id: "member_1",
    user: { id: "user_1", name: "Dawie", image: null },
  },
}: {
  feedback?: { id: string; project: { organizationId: string } } | null;
  membership?: {
    id: string;
    user: { id: string; name: string; image: string | null };
  } | null;
} = {}) {
  return {
    feedback: { findUnique: vi.fn().mockResolvedValue(feedback) },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
    feedbackComment: {
      create: vi.fn().mockResolvedValue({
        id: "comment_1",
        createdAt: new Date("2026-01-02T03:04:05.000Z"),
        body: input.body,
      }),
    },
  } as unknown as FakeDb;
}

describe("createFeedbackComment", () => {
  it("reports an unknown feedback as not found", async () => {
    const db = fakeDb({ feedback: null });

    await expect(createFeedbackComment(input, db)).rejects.toThrow(
      new NotFoundError("Feedback not found."),
    );
  });

  it("refuses a caller outside the feedback's organization", async () => {
    const db = fakeDb({ membership: null });

    await expect(createFeedbackComment(input, db)).rejects.toThrow(
      new ForbiddenError("Access denied."),
    );
  });

  it("stores the reply as a member-authored comment", async () => {
    const db = fakeDb();

    await expect(createFeedbackComment(input, db)).resolves.toEqual({
      id: "comment_1",
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
      authorType: "member",
      body: "Looking into it.",
      author: { id: "member_1", name: "Dawie", image: null },
    });

    expect(db.feedbackComment.create).toHaveBeenCalledWith({
      data: {
        feedbackId: "feedback_1",
        authorType: "member",
        memberId: "member_1",
        body: "Looking into it.",
      },
    });
  });
});
