import { describe, expect, it } from "vitest";

import { getBoardColumnId } from "./get-board-column-id";

const columns = [
  { id: "col_new", category: "new" },
  { id: "col_progress", category: "in_progress" },
  { id: "col_test", category: "in_progress" },
  { id: "col_resolved", category: "resolved" },
];

describe("getBoardColumnId", () => {
  it("keeps a pinned column whose category matches the status", () => {
    expect(
      getBoardColumnId(
        { columnId: "col_test", status: "in_progress" },
        columns,
      ),
    ).toBe("col_test");
  });

  it("falls back to the first column of the category when columnId is null", () => {
    expect(
      getBoardColumnId({ columnId: null, status: "in_progress" }, columns),
    ).toBe("col_progress");
  });

  it("ignores a stale column whose category no longer matches the status", () => {
    expect(
      getBoardColumnId({ columnId: "col_test", status: "resolved" }, columns),
    ).toBe("col_resolved");
  });

  it("returns null when the category has no column", () => {
    expect(
      getBoardColumnId({ columnId: null, status: "closed" }, columns),
    ).toBeNull();
  });
});
