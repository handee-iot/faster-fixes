import { BadRequestError, ForbiddenError } from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";

import { deleteFeedbackColumn } from "./delete-feedback-column";

type FakeDb = NonNullable<Parameters<typeof deleteFeedbackColumn>[1]>;

const input = { columnId: "column_1", userId: "user_1" };

function fakeDb({
  column = {
    id: "column_1",
    projectId: "project_1",
    category: "in_progress",
    position: 2,
    project: { organizationId: "org_1" },
  },
  membership = { id: "member_1" },
  siblings = 2,
}: {
  column?: unknown;
  membership?: { id: string } | null;
  siblings?: number;
} = {}) {
  const db = {
    feedbackColumn: {
      findUnique: vi.fn().mockResolvedValue(column),
      count: vi.fn().mockResolvedValue(siblings),
      delete: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return db as unknown as FakeDb;
}

describe("deleteFeedbackColumn", () => {
  it("refuses a caller who is not an owner or admin", async () => {
    const db = fakeDb({ membership: null });

    await expect(deleteFeedbackColumn(input, db)).rejects.toThrow(
      new ForbiddenError("Only owners and admins can edit board columns."),
    );
  });

  it("keeps the last column of a status group", async () => {
    const db = fakeDb({ siblings: 1 });

    await expect(deleteFeedbackColumn(input, db)).rejects.toThrow(
      new BadRequestError("Each status group needs at least one column."),
    );
  });

  it("deletes the column and closes the gap behind it", async () => {
    const db = fakeDb();

    await expect(deleteFeedbackColumn(input, db)).resolves.toEqual({
      id: "column_1",
    });

    expect(db.feedbackColumn.delete).toHaveBeenCalledWith({
      where: { id: "column_1" },
    });
    expect(db.feedbackColumn.updateMany).toHaveBeenCalledWith({
      where: { projectId: "project_1", position: { gt: 2 } },
      data: { position: { decrement: 1 } },
    });
  });
});
