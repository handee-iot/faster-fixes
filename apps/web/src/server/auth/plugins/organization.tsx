import { sendOrganizationInvitationEmail } from "@/server/auth/send-organization-invitation";
import { organization } from "better-auth/plugins";

export const organizationPlugin = organization({
  schema: {
    organization: {
      additionalFields: {
        isDefault: {
          type: "boolean",
          required: true,
          defaultValue: false,
        },
      },
    },
  },
  sendInvitationEmail: async (data) => {
    try {
      await sendOrganizationInvitationEmail({
        id: data.id,
        email: data.email,
        organizationName: data.organization.name,
        inviterName: data.inviter.user.name || data.inviter.user.email,
        role: data.role,
      });
    } catch (error) {
      // The invitation is already stored; a mailer outage must not undo it.
      console.error("Error sending organization invitation email:", error);
    }
  },
});
