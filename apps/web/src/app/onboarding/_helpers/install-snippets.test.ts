import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildReactLayoutSnippet,
  buildScriptEmbedSnippet,
} from "./install-snippets";

const PROJECT_ID = "proj_abc123";
const SELF_HOSTED_ORIGIN = "https://faster-fixes.handee.co.za";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildReactLayoutSnippet", () => {
  it("wraps the layout in a FeedbackProvider carrying the Project public ID", () => {
    vi.stubEnv("NEXT_PUBLIC_FF_API_ORIGIN", "");
    const snippet = buildReactLayoutSnippet(PROJECT_ID);

    expect(snippet).toContain(
      'import { FeedbackProvider } from "@fasterfixes/react";',
    );
    expect(snippet).toContain(`<FeedbackProvider projectId="${PROJECT_ID}">`);
  });

  it("pins apiOrigin on a self-hosted instance", () => {
    vi.stubEnv("NEXT_PUBLIC_FF_API_ORIGIN", SELF_HOSTED_ORIGIN);
    const snippet = buildReactLayoutSnippet(PROJECT_ID);

    expect(snippet).toContain(
      `<FeedbackProvider projectId="${PROJECT_ID}" apiOrigin="${SELF_HOSTED_ORIGIN}">`,
    );
  });
});

describe("buildScriptEmbedSnippet", () => {
  it("renders one script tag on the @1 channel with the Project public ID", () => {
    vi.stubEnv("NEXT_PUBLIC_FF_API_ORIGIN", "");
    expect(buildScriptEmbedSnippet(PROJECT_ID)).toBe(
      `<script src="https://cdn.jsdelivr.net/npm/@fasterfixes/widget@1/dist/widget.iife.js" data-project-id="${PROJECT_ID}" defer></script>`,
    );
  });

  it("fits on a single line", () => {
    vi.stubEnv("NEXT_PUBLIC_FF_API_ORIGIN", "");
    expect(buildScriptEmbedSnippet(PROJECT_ID)).not.toContain("\n");
  });

  it("pins data-api-origin on a self-hosted instance, normalizing a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_FF_API_ORIGIN", `${SELF_HOSTED_ORIGIN}/`);
    expect(buildScriptEmbedSnippet(PROJECT_ID)).toBe(
      `<script src="https://cdn.jsdelivr.net/npm/@fasterfixes/widget@1/dist/widget.iife.js" data-project-id="${PROJECT_ID}" data-api-origin="${SELF_HOSTED_ORIGIN}" defer></script>`,
    );
  });
});
