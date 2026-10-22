import { describe, expect, it } from "vitest";

import { readIssuesHidden, writeIssuesHidden } from "./issues-hidden.js";

function fakeStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    values,
  };
}

describe("readIssuesHidden", () => {
  it("is false when nothing was stored", () => {
    expect(readIssuesHidden(fakeStore())).toBe(false);
  });

  it("is true after the Reviewer hid their issues", () => {
    const store = fakeStore();
    writeIssuesHidden(true, store);
    expect(readIssuesHidden(store)).toBe(true);
  });

  it("is false again after the issues are shown", () => {
    const store = fakeStore({ ff_issues_hidden: "1" });
    writeIssuesHidden(false, store);
    expect(readIssuesHidden(store)).toBe(false);
    expect(store.values.has("ff_issues_hidden")).toBe(false);
  });

  it("survives a missing or throwing store", () => {
    expect(readIssuesHidden(null)).toBe(false);
    expect(() => writeIssuesHidden(true, null)).not.toThrow();
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readIssuesHidden(throwing)).toBe(false);
    expect(() => writeIssuesHidden(true, throwing)).not.toThrow();
  });
});
