import z from "zod";

export const ResendInvitationSchema = z.object({
  invitationId: z.string(),
});

export type ResendInvitationInput = z.infer<typeof ResendInvitationSchema>;
