import { describe, expect, it } from "vitest";

import { formatFeedbackAsMarkdown } from "./format-feedback-markdown";

const base = {
  id: "feedback_1",
  status: "new",
  comment: "These are the income / expenses fields we need.",
  pageUrl: "https://client.test/apply",
  selector: null,
  clickX: null,
  clickY: null,
  viewportWidth: null,
  viewportHeight: null,
  browserName: null,
  browserVersion: null,
  os: null,
  screenshotUrl: null,
  metadata: null,
};

describe("formatFeedbackAsMarkdown", () => {
  it("links files attached to the report", () => {
    const markdown = formatFeedbackAsMarkdown({
      ...base,
      attachments: [
        {
          id: "asset_1",
          filename: "income-expenses.png",
          mimeType: "image/png",
          size: 202768,
          url: "https://assets.example.test/income-expenses.png",
        },
      ],
    });

    expect(markdown).toContain("## Attachments");
    expect(markdown).toContain(
      "[income-expenses.png](https://assets.example.test/income-expenses.png)",
    );
  });

  it("skips the section when there are no attachments", () => {
    expect(
      formatFeedbackAsMarkdown({ ...base, attachments: [] }),
    ).not.toContain("## Attachments");
  });
});
