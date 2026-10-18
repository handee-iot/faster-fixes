import { auth } from "@/server/auth";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { PORTAL_REVIEWER_COOKIE } from "../../_helpers/portal-reviewer-cookie";
import { findPortalReviewer } from "../../_services/find-portal-reviewer";
import { PortalBoard } from "../_features/portal-board.client";

export const metadata: Metadata = {
  title: "Feedback board",
  robots: { index: false },
};

/**
 * The board on its own (ADR-0022), for the CRM embed: no portal chrome, and
 * the hand-off cookie signs the request in as the Reviewer.
 */
export default async function PortalEmbedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const token = (await cookies()).get(PORTAL_REVIEWER_COOKIE)?.value;
  const reviewer = await findPortalReviewer({
    email: session?.user.email,
    token,
  });

  if (!reviewer) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <p className="text-center text-sm text-muted-foreground">
          This feedback board is not available. Ask Handee to check the link.
        </p>
      </main>
    );
  }

  return (
    <PortalBoard
      embedded
      projectName={reviewer.project.name}
      siteUrl={`https://${reviewer.project.domain}`}
      reviewerName={reviewer.name}
    />
  );
}
