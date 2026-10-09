import type { FeedbackItem, FeedbackStatus } from "@fasterfixes/core";
import { describe, expect, it } from "vitest";

import {
  listedFeedback,
  pageItems,
  pagePath,
  statusLabel,
} from "./feedback-list.js";

function item(id: string, status: FeedbackStatus) {
  return { id, status } as FeedbackItem;
}

describe("listedFeedback", () => {
  const items = [
    item("new", "new"),
    item("progress", "in_progress"),
    item("resolved", "resolved"),
    item("closed", "closed"),
  ];

  it("hides resolved and closed items by default", () => {
    expect(listedFeedback(items, false).map(({ id }) => id)).toEqual([
      "new",
      "progress",
    ]);
  });

  it("lists every item when resolved ones are shown", () => {
    expect(listedFeedback(items, true)).toEqual(items);
  });
});

describe("pagePath", () => {
  it("keeps the path and query of the page URL", () => {
    expect(pagePath("https://example.com/pricing?plan=pro#faq")).toBe(
      "/pricing?plan=pro",
    );
  });

  it("returns an unparsable value unchanged", () => {
    expect(pagePath("not a url")).toBe("not a url");
  });
});

describe("pageItems", () => {
  it("keeps only the items submitted on the page", () => {
    const items = [
      { id: "a", pageUrl: "https://example.com/pricing" },
      { id: "b", pageUrl: "https://example.com/" },
      { id: "c", pageUrl: "https://example.com/pricing" },
    ] as FeedbackItem[];

    expect(
      pageItems(items, "https://example.com/pricing").map(({ id }) => id),
    ).toEqual(["a", "c"]);
  });

  it("ignores the query so the page matches across params", () => {
    const items = [
      { id: "a", pageUrl: "https://example.com/pricing?plan=pro" },
    ] as FeedbackItem[];

    expect(pageItems(items, "https://example.com/pricing")).toEqual(items);
  });
});

describe("statusLabel", () => {
  it("reads an underscored status as words", () => {
    expect(statusLabel("in_progress")).toBe("in progress");
    expect(statusLabel("new")).toBe("new");
  });
});
