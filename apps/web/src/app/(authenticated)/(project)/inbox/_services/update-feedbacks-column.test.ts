import { ForbiddenError } from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";

import { updateFeedbacksColumn } from "./update-feedbacks-column";

vi.mock("@/server/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

import { inngest } from "@/server/inngest";

type FakeDb = NonNullable<Parameters<typeof updateFeedbacksColumn>[1]>;

const input = {
  feedbackIds: ["feedback_1", "feedback_2"],
  columnId: "column_1",
  userId: "user_1",
};

function fakeDb({
  column = {
    id: "column_1",
    projectId: "project_1",
    category: "in_progress",
    project: { organizationId: "org_1" },
  },
  membership = { id: "member_1" },
  previous = [
    { id: "feedback_1", status: "new" },
    { id: "feedback_2", status: "in_progress" },
  ],
}: {
  column?: unknown;
  membership?: { id: string } | null;
  previous?: Array<{ id: string; status: string }>;
} = {}) {
  const db = {
    feedbackColumn: { findUnique: vi.fn().mockResolvedValue(column) },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
    feedback: {
      findMany: vi.fn().mockResolvedValue(previous),
      updateMany: vi.fn().mockResolvedValue({ count: previous.length }),
    },
  };
  return db as unknown as FakeDb;
}

describe("updateFeedbacksColumn", () => {
  it("refuses a caller outside the column's organization", async () => {
    const db = fakeDb({ membership: null });

    await expect(updateFeedbacksColumn(input, db)).rejects.toThrow(
      new ForbiddenError("Access denied."),
    );
  });

  it("moves the cards onto the column, scoped to the column's project", async () => {
    const db = fakeDb();

    await expect(updateFeedbacksColumn(input, db)).resolves.toEqual({
      count: 2,
    });

    expect(db.feedback.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["feedback_1", "feedback_2"] },
        projectId: "project_1",
      },
      data: { columnId: "column_1", status: "in_progress" },
    });
  });

  it("only fans out a status-change event for cards whose status actually changes", async () => {
    const db = fakeDb();

    await updateFeedbacksColumn(input, db);

    expect(inngest.send).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(inngest.send).mock.calls[0]?.[0];
    expect(payload).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ feedbackId: "feedback_1" }),
      }),
    ]);
  });
});
