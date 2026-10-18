import { findActiveReviewerByToken } from "@/app/_domains/project/_services/find-active-reviewer-by-token";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PORTAL_REVIEWER_COOKIE } from "../../_helpers/portal-reviewer-cookie";

/**
 * The embed hand-off (ADR-0022): the CRM opens this URL with the Reviewer's
 * token, which becomes an HttpOnly cookie, and then redirects to the clean
 * embed URL so the token does not linger in the frame's history.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const reviewer = token ? await findActiveReviewerByToken(token) : null;

  const response = NextResponse.redirect(
    new URL("/portal/embed", req.nextUrl.origin),
  );
  response.headers.set("Cache-Control", "no-store");

  if (reviewer) {
    response.cookies.set(PORTAL_REVIEWER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/portal",
      // Long enough to survive a working day without another hand-off; the
      // CRM re-runs the hand-off on every page render anyway.
      maxAge: 60 * 60 * 12,
    });
  }

  return response;
}

export const dynamic = "force-dynamic";
