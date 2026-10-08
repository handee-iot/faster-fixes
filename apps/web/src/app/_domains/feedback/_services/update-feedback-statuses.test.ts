import { describe, expect, it, vi } from "vitest";

import { updateFeedbackStatuses } from "./update-feedback-statuses";

type FakeDb = NonNullable<Parameters<typeof updateFeedbackStatuses>[0]>;

function fakeDb() {
  return {
    feedback: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as unknown as FakeDb;
}

describe("updateFeedbackStatuses", () => {
  it("only touches rows whose status actually changes, and resets the column", async () => {
    const db = fakeDb();

    await updateFeedbackStatuses(db, { id: "feedback_1" }, "resolved");

    expect(db.feedback.updateMany).toHaveBeenCalledWith({
      where: { AND: [{ id: "feedback_1" }, { status: { not: "resolved" } }] },
      data: { status: "resolved", columnId: null },
    });
  });

  it("composes the status guard with the caller's where clause", async () => {
    const db = fakeDb();

    await updateFeedbackStatuses(
      db,
      { projectId: "project_1", status: "in_progress" },
      "resolved",
    );

    expect(db.feedback.updateMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { projectId: "project_1", status: "in_progress" },
          { status: { not: "resolved" } },
        ],
      },
      data: { status: "resolved", columnId: null },
    });
  });
});
