import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const findActiveReviewerByToken = vi.fn();

vi.mock(
  "@/app/_domains/project/_services/find-active-reviewer-by-token",
  () => ({ findActiveReviewerByToken }),
);

const { GET } = await import("./route");

const REVIEWER = {
  id: "reviewer_1",
  name: "Earl",
  projectId: "project_1",
  project: { name: "Testing 123", domain: "local.test" },
};

function request(query = "") {
  return new NextRequest(
    `https://faster-fixes.handee.co.za/portal/handoff${query}`,
  );
}

describe("GET /portal/handoff", () => {
  beforeEach(() => {
    findActiveReviewerByToken.mockReset();
  });

  it("sets the reviewer cookie and redirects to the embed", async () => {
    findActiveReviewerByToken.mockResolvedValueOnce(REVIEWER);

    const response = await GET(request("?token=abc123"));

    expect(findActiveReviewerByToken).toHaveBeenCalledWith("abc123");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://faster-fixes.handee.co.za/portal/embed",
    );
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("portal_reviewer=abc123");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/portal");
  });

  it("redirects without a cookie when the token is unknown", async () => {
    findActiveReviewerByToken.mockResolvedValueOnce(null);

    const response = await GET(request("?token=wrong"));

    expect(response.status).toBe(307);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("redirects without looking anything up when no token is given", async () => {
    const response = await GET(request());

    expect(findActiveReviewerByToken).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
