import { BadRequestError, ForbiddenError } from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";

import { updateFeedbackColumnPosition } from "./update-feedback-column-position";

type FakeDb = NonNullable<Parameters<typeof updateFeedbackColumnPosition>[1]>;

const input = {
  columnId: "column_1",
  direction: "up" as const,
  userId: "user_1",
};

function fakeDb({
  column = {
    id: "column_1",
    projectId: "project_1",
    category: "in_progress",
    position: 2,
    project: { organizationId: "org_1" },
  },
  membership = { id: "member_1" },
  neighbor = {
    id: "column_2",
    category: "in_progress",
    position: 1,
  },
}: {
  column?: unknown;
  membership?: { id: string } | null;
  neighbor?: { id: string; category: string; position: number } | null;
} = {}) {
  const db = {
    feedbackColumn: {
      findUnique: vi.fn().mockResolvedValue(column),
      findFirst: vi.fn().mockResolvedValue(neighbor),
      update: vi.fn().mockResolvedValue({}),
    },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return db as unknown as FakeDb;
}

describe("updateFeedbackColumnPosition", () => {
  it("refuses a caller who is not an owner or admin", async () => {
    const db = fakeDb({ membership: null });

    await expect(updateFeedbackColumnPosition(input, db)).rejects.toThrow(
      new ForbiddenError("Only owners and admins can edit board columns."),
    );
  });

  it("refuses to move a column outside its status group", async () => {
    const db = fakeDb({
      neighbor: { id: "column_2", category: "new", position: 1 },
    });

    await expect(updateFeedbackColumnPosition(input, db)).rejects.toThrow(
      new BadRequestError("A column can only move within its status group."),
    );
  });

  it("refuses when there is no column to swap with", async () => {
    const db = fakeDb({ neighbor: null });

    await expect(updateFeedbackColumnPosition(input, db)).rejects.toThrow(
      new BadRequestError("A column can only move within its status group."),
    );
  });

  it("swaps positions with the neighbor in the same category", async () => {
    const db = fakeDb();

    await expect(updateFeedbackColumnPosition(input, db)).resolves.toEqual({
      id: "column_1",
    });

    expect(db.feedbackColumn.update).toHaveBeenCalledWith({
      where: { id: "column_1" },
      data: { position: 1 },
    });
    expect(db.feedbackColumn.update).toHaveBeenCalledWith({
      where: { id: "column_2" },
      data: { position: 2 },
    });
  });
});
