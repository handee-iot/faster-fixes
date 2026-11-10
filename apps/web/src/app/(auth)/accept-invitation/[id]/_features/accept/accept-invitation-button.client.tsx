"use client";

import { organization, useListOrganizations } from "@/lib/auth";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type AcceptInvitationButtonProps = {
  invitationId: string;
  organizationId: string;
};

export function AcceptInvitationButton({
  invitationId,
  organizationId,
}: AcceptInvitationButtonProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const { refetch: refetchOrganizations } = useListOrganizations();
  const queryClient = useQueryClient();

  const acceptMutation = useMutation(
    trpc.authenticated.organization.invitation.accept.mutationOptions({
      onSuccess: async () => {
        await organization.setActive({ organizationId });
        await refetchOrganizations();
        await queryClient.invalidateQueries(
          trpc.authenticated.organization.invitation.listReceived.queryFilter(),
        );
        toast.success("Invitation accepted");
        router.push("/inbox");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to accept the invitation.");
      },
    }),
  );

  return (
    <Button
      className="w-full"
      disabled={acceptMutation.isPending}
      onClick={() => acceptMutation.mutate({ invitationId })}
    >
      {acceptMutation.isPending ? "Accepting..." : "Accept invitation"}
    </Button>
  );
}
