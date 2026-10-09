import { describe, expect, it, vi } from "vitest";

import { allocateFeedbackNumbers } from "./allocate-feedback-numbers";

type FakeDb = NonNullable<Parameters<typeof allocateFeedbackNumbers>[2]>;

function fakeDb(feedbackSequence: number) {
  return {
    project: {
      update: vi.fn().mockResolvedValue({ feedbackSequence }),
    },
  } as unknown as FakeDb;
}

describe("allocateFeedbackNumbers", () => {
  it("returns the reserved number for a single reservation", async () => {
    const db = fakeDb(7);

    await expect(allocateFeedbackNumbers("project_1", 1, db)).resolves.toBe(7);
    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: "project_1" },
      data: { feedbackSequence: { increment: 1 } },
      select: { feedbackSequence: true },
    });
  });

  it("returns the first of a reserved batch", async () => {
    const db = fakeDb(12);

    await expect(allocateFeedbackNumbers("project_1", 3, db)).resolves.toBe(10);
    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: "project_1" },
      data: { feedbackSequence: { increment: 3 } },
      select: { feedbackSequence: true },
    });
  });
});
