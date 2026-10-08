import { describe, expect, it } from "vitest";

import { pageLabel } from "./page-label";

describe("pageLabel", () => {
  it("keeps the host and path", () => {
    expect(pageLabel("https://example.com/pricing")).toBe(
      "example.com/pricing",
    );
  });

  it("drops the query and fragment", () => {
    expect(pageLabel("https://example.com/pricing?plan=pro#faq")).toBe(
      "example.com/pricing",
    );
  });

  it("keeps the port", () => {
    expect(pageLabel("http://localhost:4321/")).toBe("localhost:4321/");
  });

  it("returns an unparsable value unchanged", () => {
    expect(pageLabel("not a url")).toBe("not a url");
  });
});
