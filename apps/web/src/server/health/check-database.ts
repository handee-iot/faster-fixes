import { prisma } from "@workspace/db";

/** True when the database answers a trivial round-trip. */
export async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
