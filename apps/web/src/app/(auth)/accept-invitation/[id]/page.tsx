import { ORGANIZATION_ROLES } from "@/app/_domains/organization";
import { auth } from "@/server/auth";
import { Button } from "@workspace/ui/components/button";
import type { Metadata } from "next";
import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { AcceptInvitationButton } from "./_features/accept/accept-invitation-button.client";
import { SignOutButton } from "./_features/sign-out/sign-out-button.client";
import { getInvitation } from "./_services/get-invitation";

export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false },
};

const ROLE_LABELS: Partial<Record<string, string>> = ORGANIZATION_ROLES;

type InvitationShellProps = {
  children: React.ReactNode;
};

/** The centred card the sign-in and sign-up screens use, so this reads as one of them. */
function InvitationShell({ children }: InvitationShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Accept invitation</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * The invitation link's landing page. It carries the invitation id, so a
 * brand-new invitee can create an account from here, verify, come straight
 * back and accept, without having to find the invitations page first.
 */
type AcceptInvitationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AcceptInvitationPage({
  params,
}: AcceptInvitationPageProps) {
  const { id } = await params;
  const invitation = await getInvitation({ invitationId: id });
  const session = await auth.api.getSession({ headers: await headers() });
  const nextPath = `/accept-invitation/${id}`;
  const signInHref = `/login?nextUrl=${encodeURIComponent(nextPath)}`;
  const signUpHref = `/signup?nextUrl=${encodeURIComponent(nextPath)}`;

  if (!invitation) {
    return (
      <InvitationShell>
        <p className="text-center text-sm text-muted-foreground">
          This invitation does not exist. The link may have been withdrawn, or
          it was mistyped.
        </p>
      </InvitationShell>
    );
  }

  const role =
    ROLE_LABELS[invitation.role ?? ""] ?? invitation.role ?? "member";
  const inviterName =
    invitation.user.name || invitation.user.email || "A teammate";

  const summary = (
    <p className="text-center text-sm text-muted-foreground">
      <strong className="text-foreground">{inviterName}</strong> invited you to
      join{" "}
      <strong className="text-foreground">
        {invitation.organization.name}
      </strong>{" "}
      as <strong className="text-foreground">{role}</strong>.
    </p>
  );

  if (invitation.status !== "pending") {
    return (
      <InvitationShell>
        <p className="text-center text-sm text-muted-foreground">
          This invitation has already been answered.
          {session ? null : (
            <>
              {" "}
              <Link href="/login" className="font-medium underline">
                Sign in
              </Link>{" "}
              to continue.
            </>
          )}
        </p>
      </InvitationShell>
    );
  }

  if (invitation.expiresAt <= new Date()) {
    return (
      <InvitationShell>
        {summary}
        <p className="text-center text-sm text-muted-foreground">
          This invitation has expired. Ask an administrator to send a new one.
        </p>
      </InvitationShell>
    );
  }

  if (!session) {
    return (
      <InvitationShell>
        {summary}
        <p className="text-center text-sm text-muted-foreground">
          Use <strong className="text-foreground">{invitation.email}</strong>{" "}
          when you sign in, or create an account with that address.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={signInHref as Route}>Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={signUpHref as Route}>Create an account</Link>
          </Button>
        </div>
      </InvitationShell>
    );
  }

  const sessionEmail = session.user.email.trim().toLowerCase();
  const invitationEmail = invitation.email.trim().toLowerCase();

  if (sessionEmail !== invitationEmail) {
    return (
      <InvitationShell>
        {summary}
        <p className="text-center text-sm text-muted-foreground">
          You are signed in as{" "}
          <strong className="text-foreground">{session.user.email}</strong>, but
          this invitation is for{" "}
          <strong className="text-foreground">{invitation.email}</strong>. Sign
          in with that address instead.
        </p>
        <SignOutButton />
      </InvitationShell>
    );
  }

  return (
    <InvitationShell>
      {summary}
      <p className="text-center text-sm text-muted-foreground">
        Signed in as {session.user.email}.
      </p>
      <AcceptInvitationButton
        invitationId={invitation.id}
        organizationId={invitation.organization.id}
      />
    </InvitationShell>
  );
}
