import { findActiveReviewerByEmail } from "@/app/_domains/project/_services/find-active-reviewer-by-email";
import { auth } from "@/server/auth";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { PortalNoAccess, PortalSignIn } from "./_features/portal-auth.client";
import { PortalBoard } from "./_features/portal-board.client";

export const metadata: Metadata = {
  title: "Feedback board",
  robots: { index: false },
};

/**
 * The reviewer portal (ADR-0021): a magic-link sign-in, then the board of the
 * Reviewer's own Project. Everyone else signed in gets the no-access state.
 */
export default async function PortalPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <PortalSignIn />;
  }

  const reviewer = await findActiveReviewerByEmail(session.user.email);

  if (!reviewer) {
    return <PortalNoAccess email={session.user.email} />;
  }

  return (
    <PortalBoard
      projectName={reviewer.project.name}
      reviewerName={reviewer.name}
    />
  );
}
