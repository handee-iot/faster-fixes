/**
 * Characterization tests: they pin what an installed widget observes on
 * `GET` and `POST /api/v1/feedback/:id/comments` (status, JSON body), so the
 * route boundary can be proven compatible. They assert on responses only,
 * never on how the handler reaches them.
 *
 * A test here that has to change is a broken contract, not a test to update:
 * widgets already installed on customer sites cannot be forced to update.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  blockRateLimit,
  FEEDBACK_ID,
  resetWidgetApiDoubles,
  REVIEWER_ID,
  REVIEWER_NAME,
  widgetApiPrisma,
  widgetRequest,
} from "../../_helpers/widget-api-test-doubles";

vi.mock("@workspace/db", async () => {
  const { widgetApiPrisma } =
    await import("../../_helpers/widget-api-test-doubles");
  return { prisma: widgetApiPrisma };
});

vi.mock("@/server/storage", () => ({ s3Client: {} }));

const { GET, POST } = await import("./route");

const ROUTE_URL = `https://app.test/api/v1/feedback/${FEEDBACK_ID}/comments`;

const CREATED_AT = new Date("2026-01-02T03:04:05.000Z");

function routeContext(id: string = FEEDBACK_ID) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  resetWidgetApiDoubles();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/v1/feedback/[id]/comments", () => {
  it("refuses a request without the project key", async () => {
    const response = await GET(
      widgetRequest(ROUTE_URL, { apiKey: null }),
      routeContext(),
    );

    expect(response.status).toBe(401);
  });

  it("refuses a disallowed origin", async () => {
    const response = await GET(
      widgetRequest(ROUTE_URL, { origin: "https://evil.test" }),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("refuses an unknown reviewer token", async () => {
    widgetApiPrisma.reviewer.findFirst.mockResolvedValue(null);

    const response = await GET(
      widgetRequest(ROUTE_URL, { reviewerToken: "nope" }),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("reports an unknown feedback as not found", async () => {
    widgetApiPrisma.feedback.findFirst.mockResolvedValue(null);

    const response = await GET(widgetRequest(ROUTE_URL), routeContext());

    expect(response.status).toBe(404);
  });

  it("returns the thread, oldest first", async () => {
    widgetApiPrisma.feedbackComment.findMany.mockResolvedValue([
      {
        id: "comment_1",
        createdAt: CREATED_AT,
        authorType: "reviewer",
        body: "Any update on this?",
        reviewer: { id: REVIEWER_ID, name: REVIEWER_NAME },
        member: null,
      },
      {
        id: "comment_2",
        createdAt: CREATED_AT,
        authorType: "member",
        body: "Fixed in the next deploy.",
        reviewer: null,
        member: { id: "member_1", user: { id: "user_1", name: "Dawie" } },
      },
    ] as never);

    const response = await GET(widgetRequest(ROUTE_URL), routeContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      comments: [
        {
          id: "comment_1",
          createdAt: "2026-01-02T03:04:05.000Z",
          authorType: "reviewer",
          body: "Any update on this?",
          author: { id: REVIEWER_ID, name: REVIEWER_NAME },
        },
        {
          id: "comment_2",
          createdAt: "2026-01-02T03:04:05.000Z",
          authorType: "member",
          body: "Fixed in the next deploy.",
          author: { id: "member_1", name: "Dawie" },
        },
      ],
    });
  });

  it("answers a rate limited caller with 429", async () => {
    vi.useFakeTimers();
    blockRateLimit();

    const response = await GET(widgetRequest(ROUTE_URL), routeContext());

    expect(response.status).toBe(429);
  });
});

describe("POST /api/v1/feedback/[id]/comments", () => {
  function replyRequest(body: unknown) {
    return widgetRequest(ROUTE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects a body that is not JSON", async () => {
    const response = await POST(
      widgetRequest(ROUTE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      routeContext(),
    );

    expect(response.status).toBe(400);
  });

  it("rejects an empty message", async () => {
    const response = await POST(replyRequest({ body: "   " }), routeContext());

    expect(response.status).toBe(422);
  });

  it("stores the reply as a reviewer-authored comment", async () => {
    widgetApiPrisma.feedbackComment.create.mockResolvedValue({
      id: "comment_1",
      createdAt: CREATED_AT,
      body: "Any update on this?",
      reviewer: { id: REVIEWER_ID, name: REVIEWER_NAME },
    } as never);

    const response = await POST(
      replyRequest({ body: "Any update on this?" }),
      routeContext(),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "comment_1",
      createdAt: "2026-01-02T03:04:05.000Z",
      authorType: "reviewer",
      body: "Any update on this?",
      author: { id: REVIEWER_ID, name: REVIEWER_NAME },
    });
    expect(widgetApiPrisma.feedbackComment.create).toHaveBeenCalledWith({
      data: {
        feedbackId: FEEDBACK_ID,
        authorType: "reviewer",
        reviewerId: REVIEWER_ID,
        body: "Any update on this?",
      },
      include: { reviewer: { select: { id: true, name: true } } },
    });
  });
});
