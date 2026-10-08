import { describe, expect, it, vi } from "vitest";

import { listFeedbackComments } from "./list-feedback-comments";

vi.mock("@workspace/db", () => ({
  prisma: {
    feedbackComment: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "@workspace/db";

const input = { projectId: "project_1", feedbackId: "feedback_1" };

describe("listFeedbackComments (widget)", () => {
  it("scopes the read to the project and orders oldest first", async () => {
    await listFeedbackComments(input);

    expect(prisma.feedbackComment.findMany).toHaveBeenCalledWith({
      where: { feedbackId: "feedback_1", feedback: { projectId: "project_1" } },
      orderBy: { createdAt: "asc" },
      include: {
        reviewer: { select: { id: true, name: true } },
        member: {
          select: { id: true, user: { select: { id: true, name: true } } },
        },
      },
    });
  });

  it("maps a member author to the user name", async () => {
    vi.mocked(prisma.feedbackComment.findMany).mockResolvedValueOnce([
      {
        id: "comment_1",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        authorType: "member",
        body: "Fixed in the next deploy.",
        reviewer: null,
        member: { id: "member_1", user: { id: "user_1", name: "Dawie" } },
      },
    ] as never);

    await expect(listFeedbackComments(input)).resolves.toEqual([
      {
        id: "comment_1",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        authorType: "member",
        body: "Fixed in the next deploy.",
        author: { id: "member_1", name: "Dawie" },
      },
    ]);
  });
});
