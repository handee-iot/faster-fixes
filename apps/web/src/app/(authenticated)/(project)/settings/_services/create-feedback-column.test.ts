import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";

import { createFeedbackColumn } from "./create-feedback-column";

type FakeDb = NonNullable<Parameters<typeof createFeedbackColumn>[1]>;

const input = {
  projectId: "project_1",
  name: "In Test",
  category: "in_progress" as const,
  userId: "user_1",
};

function fakeDb({
  project = { organizationId: "org_1" },
  membership = { id: "member_1" },
  clash = null,
  lastPosition = 1,
}: {
  project?: { organizationId: string } | null;
  membership?: { id: string } | null;
  clash?: { id: string } | null;
  lastPosition?: number;
} = {}) {
  const tx = {
    feedbackColumn: {
      findFirstOrThrow: vi.fn().mockResolvedValue({ position: lastPosition }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: "column_new" }),
    },
  };
  const db = {
    project: { findUnique: vi.fn().mockResolvedValue(project) },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
    feedbackColumn: { findFirst: vi.fn().mockResolvedValue(clash) },
    $transaction: vi
      .fn()
      .mockImplementation((fn: (tx: unknown) => unknown) => fn(tx)),
  };
  return { db: db as unknown as FakeDb, tx };
}

describe("createFeedbackColumn", () => {
  it("reports an unknown project as not found", async () => {
    const { db } = fakeDb({ project: null });

    await expect(createFeedbackColumn(input, db)).rejects.toThrow(
      new NotFoundError("Project not found."),
    );
  });

  it("refuses a caller who is not an owner or admin", async () => {
    const { db } = fakeDb({ membership: null });

    await expect(createFeedbackColumn(input, db)).rejects.toThrow(
      new ForbiddenError("Only owners and admins can edit board columns."),
    );
  });

  it("rejects a name that clashes with an existing column", async () => {
    const { db } = fakeDb({ clash: { id: "column_1" } });

    await expect(createFeedbackColumn(input, db)).rejects.toThrow(
      new ConflictError("A column with this name already exists."),
    );
  });

  it("appends to the end of the category's group and shifts later columns", async () => {
    const { db, tx } = fakeDb({ lastPosition: 3 });

    await expect(createFeedbackColumn(input, db)).resolves.toEqual({
      id: "column_new",
    });

    expect(tx.feedbackColumn.updateMany).toHaveBeenCalledWith({
      where: { projectId: "project_1", position: { gte: 4 } },
      data: { position: { increment: 1 } },
    });
    expect(tx.feedbackColumn.create).toHaveBeenCalledWith({
      data: {
        projectId: "project_1",
        name: "In Test",
        category: "in_progress",
        position: 4,
      },
      select: { id: true },
    });
  });
});
