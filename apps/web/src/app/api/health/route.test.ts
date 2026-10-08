import { beforeEach, describe, expect, it, vi } from "vitest";

const checkDatabase = vi.fn<() => Promise<boolean>>();

vi.mock("@/server/health/check-database", () => ({ checkDatabase }));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  beforeEach(() => {
    checkDatabase.mockReset();
  });

  it("reports ok when the database answers", async () => {
    checkDatabase.mockResolvedValueOnce(true);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("reports 503 when the database is unreachable", async () => {
    checkDatabase.mockResolvedValueOnce(false);

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unhealthy" });
  });
});
