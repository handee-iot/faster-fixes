import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendOrganizationInvitationEmail = vi.fn().mockResolvedValue(undefined);

vi.mock("@/server/auth/send-organization-invitation", () => ({
  sendOrganizationInvitationEmail,
}));

const { resendInvitation } = await import("./resend-invitation");

type FakeDb = NonNullable<Parameters<typeof resendInvitation>[1]>;

type InvitationRow = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  organization: { id: string; name: string };
  user: { name: string; email: string };
};

const pending: InvitationRow = {
  id: "inv_1",
  email: "morgan@handee.co.za",
  role: "member",
  status: "pending",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  organization: { id: "org_1", name: "Handee IoT" },
  user: { name: "Dawie", email: "dawie@handee.co.za" },
};

function fakeDb(
  invitation: InvitationRow | null,
  membership: { id: string } | null = { id: "member_1" },
) {
  return {
    invitation: { findUnique: vi.fn().mockResolvedValue(invitation) },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
  } as unknown as FakeDb;
}

const input = { invitationId: "inv_1", userId: "user_1" };

describe("resendInvitation", () => {
  beforeEach(() => {
    sendOrganizationInvitationEmail.mockClear();
  });

  it("reports an unknown invitation as not found", async () => {
    await expect(resendInvitation(input, fakeDb(null))).rejects.toThrow(
      new NotFoundError("Invitation not found."),
    );
    expect(sendOrganizationInvitationEmail).not.toHaveBeenCalled();
  });

  it("refuses a caller who is not an owner or an admin of the organization", async () => {
    const db = fakeDb(pending, null);

    await expect(resendInvitation(input, db)).rejects.toThrow(
      new ForbiddenError("You do not have permission to resend invitations."),
    );
    expect(db.member.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        userId: "user_1",
        role: { in: ["owner", "admin"] },
      },
    });
    expect(sendOrganizationInvitationEmail).not.toHaveBeenCalled();
  });

  it("refuses an invitation that is no longer open", async () => {
    await expect(
      resendInvitation(input, fakeDb({ ...pending, status: "accepted" })),
    ).rejects.toThrow(
      new BadRequestError(
        "This invitation is no longer open. Send a new one instead.",
      ),
    );
    expect(sendOrganizationInvitationEmail).not.toHaveBeenCalled();
  });

  it("refuses an expired invitation", async () => {
    await expect(
      resendInvitation(
        input,
        fakeDb({ ...pending, expiresAt: new Date(Date.now() - 1000) }),
      ),
    ).rejects.toThrow(
      new BadRequestError(
        "This invitation has expired. Send a new one instead.",
      ),
    );
    expect(sendOrganizationInvitationEmail).not.toHaveBeenCalled();
  });

  it("sends the invitation again to the same address", async () => {
    await expect(resendInvitation(input, fakeDb(pending))).resolves.toEqual({
      sent: true,
    });

    expect(sendOrganizationInvitationEmail).toHaveBeenCalledWith({
      id: "inv_1",
      email: "morgan@handee.co.za",
      organizationName: "Handee IoT",
      inviterName: "Dawie",
      role: "member",
    });
  });
});
