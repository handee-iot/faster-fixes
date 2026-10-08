import { describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn<(strings: TemplateStringsArray) => Promise<unknown>>();

vi.mock("@workspace/db", () => ({
  prisma: { $queryRaw: queryRaw },
}));

const { checkDatabase } = await import("./check-database");

describe("checkDatabase", () => {
  it("reports true when the round-trip answers", async () => {
    queryRaw.mockResolvedValueOnce([]);

    await expect(checkDatabase()).resolves.toBe(true);
  });

  it("reports false when the round-trip fails", async () => {
    queryRaw.mockRejectedValueOnce(new Error("connection refused"));

    await expect(checkDatabase()).resolves.toBe(false);
  });
});
