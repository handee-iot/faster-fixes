import { checkDatabase } from "@/server/health/check-database";
import { NextResponse } from "next/server";

// A database round-trip, not a page render: platforms and uptime checks get a
// cheap signal that the app and its database are both reachable.
export const dynamic = "force-dynamic";

export async function GET() {
  if (await checkDatabase()) {
    return NextResponse.json({ status: "ok" });
  }
  return NextResponse.json({ status: "unhealthy" }, { status: 503 });
}
