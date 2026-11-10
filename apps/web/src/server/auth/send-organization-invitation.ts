import { ORGANIZATION_ROLES } from "@/app/_domains/organization";
import { mailer } from "@/lib/mailer/client";
import { SENDER_FROM } from "@/lib/mailer/constants";
import { OrganizationInvitation } from "@/lib/mailer/templates/organization-invitation";
import { getAppUrl } from "@/utils/url/get-app-url";
import { render } from "@react-email/components";
import { createElement } from "react";

// Widened so an invitation role outside the known set reads as `undefined`.
const ROLE_LABELS: Partial<Record<string, string>> = ORGANIZATION_ROLES;

type OrganizationInvitationEmail = {
  /** The Invitation row's id: it is the link's key and the accept page's address. */
  id: string;
  email: string;
  organizationName: string;
  inviterName: string;
  role: string;
};

/**
 * Sends one organization invitation. The link carries the invitation id and
 * lands on a page that walks a brand-new invitee through signing up, so the
 * first send and a resend share this.
 */
export async function sendOrganizationInvitationEmail({
  id,
  email,
  organizationName,
  inviterName,
  role,
}: OrganizationInvitationEmail) {
  const body = await render(
    createElement(OrganizationInvitation, {
      organizationName,
      inviterName,
      invitationLink: `${getAppUrl()}/accept-invitation/${id}`,
      role: ROLE_LABELS[role] ?? role,
    }),
  );

  await mailer.emails.send({
    from: SENDER_FROM,
    to: email.toLowerCase().trim(),
    subject: `Invitation to join ${organizationName}`,
    body,
  });
}
