import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";

import { listFeedbackComments } from "./list-feedback-comments";

type FakeDb = NonNullable<Parameters<typeof listFeedbackComments>[1]>;

const input = { feedbackId: "feedback_1", userId: "user_1" };

function fakeDb({
  feedback = { id: "feedback_1", project: { organizationId: "org_1" } },
  membership = { id: "member_1" },
  comments = [
    {
      id: "comment_1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      authorType: "reviewer",
      body: "It breaks on Safari.",
      reviewer: { id: "reviewer_1", name: "Claire" },
      member: null,
    },
    {
      id: "comment_2",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      authorType: "member",
      body: "Reproduced, fixing now.",
      reviewer: null,
      member: {
        id: "member_1",
        user: { id: "user_1", name: "Dawie", image: "https://img.test/d.png" },
      },
    },
  ],
}: {
  feedback?: { id: string; project: { organizationId: string } } | null;
  membership?: { id: string } | null;
  comments?: unknown[];
} = {}) {
  return {
    feedback: { findUnique: vi.fn().mockResolvedValue(feedback) },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
    feedbackComment: { findMany: vi.fn().mockResolvedValue(comments) },
  } as unknown as FakeDb;
}

describe("listFeedbackComments", () => {
  it("reports an unknown feedback as not found", async () => {
    const db = fakeDb({ feedback: null });

    await expect(listFeedbackComments(input, db)).rejects.toThrow(
      new NotFoundError("Feedback not found."),
    );
  });

  it("refuses a caller outside the feedback's organization", async () => {
    const db = fakeDb({ membership: null });

    await expect(listFeedbackComments(input, db)).rejects.toThrow(
      new ForbiddenError("Access denied."),
    );
  });

  it("maps both author kinds, oldest first", async () => {
    const db = fakeDb();

    await expect(listFeedbackComments(input, db)).resolves.toEqual([
      {
        id: "comment_1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        authorType: "reviewer",
        body: "It breaks on Safari.",
        author: { id: "reviewer_1", name: "Claire", image: null },
      },
      {
        id: "comment_2",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        authorType: "member",
        body: "Reproduced, fixing now.",
        author: {
          id: "member_1",
          name: "Dawie",
          image: "https://img.test/d.png",
        },
      },
    ]);

    expect(db.feedbackComment.findMany).toHaveBeenCalledWith({
      where: { feedbackId: "feedback_1" },
      orderBy: { createdAt: "asc" },
      include: {
        reviewer: { select: { id: true, name: true } },
        member: {
          select: {
            id: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
  });
});
