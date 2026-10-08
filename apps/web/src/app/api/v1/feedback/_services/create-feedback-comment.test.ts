import { NotFoundError } from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";

import { createFeedbackComment } from "./create-feedback-comment";

vi.mock("@workspace/db", () => ({
  prisma: {
    feedback: { findFirst: vi.fn() },
    feedbackComment: { create: vi.fn() },
  },
}));

import { prisma } from "@workspace/db";

const input = {
  projectId: "project_1",
  feedbackId: "feedback_1",
  reviewerId: "reviewer_1",
  body: "Any update on this?",
};

describe("createFeedbackComment (widget)", () => {
  it("reports a feedback outside the project as not found", async () => {
    vi.mocked(prisma.feedback.findFirst).mockResolvedValueOnce(null);

    await expect(createFeedbackComment(input)).rejects.toThrow(
      new NotFoundError("Feedback not found."),
    );
    expect(prisma.feedbackComment.create).not.toHaveBeenCalled();
  });

  it("stores the reply as a reviewer-authored comment, scoped to the project", async () => {
    vi.mocked(prisma.feedback.findFirst).mockResolvedValueOnce({
      id: "feedback_1",
    } as never);
    vi.mocked(prisma.feedbackComment.create).mockResolvedValueOnce({
      id: "comment_1",
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
      body: input.body,
      reviewer: { id: "reviewer_1", name: "Claire" },
    } as never);

    await expect(createFeedbackComment(input)).resolves.toEqual({
      id: "comment_1",
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
      authorType: "reviewer",
      body: "Any update on this?",
      author: { id: "reviewer_1", name: "Claire" },
    });

    expect(prisma.feedback.findFirst).toHaveBeenCalledWith({
      where: { id: "feedback_1", projectId: "project_1" },
      select: { id: true },
    });
    expect(prisma.feedbackComment.create).toHaveBeenCalledWith({
      data: {
        feedbackId: "feedback_1",
        authorType: "reviewer",
        reviewerId: "reviewer_1",
        body: "Any update on this?",
      },
      include: { reviewer: { select: { id: true, name: true } } },
    });
  });
});
