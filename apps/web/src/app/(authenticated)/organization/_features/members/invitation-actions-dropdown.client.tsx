"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal, Send, X } from "lucide-react";
import { toast } from "sonner";

type InvitationActionsDropdownProps = {
  invitationId: string;
};

export function InvitationActionsDropdown({
  invitationId,
}: InvitationActionsDropdownProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidateList = () =>
    queryClient.invalidateQueries(
      trpc.authenticated.organization.invitation.list.queryFilter(),
    );

  const resendInvitation = useMutation(
    trpc.authenticated.organization.invitation.resend.mutationOptions({
      onSuccess: async () => {
        await invalidateList();
        toast.success("Invitation sent again");
      },
      onError: (error) => {
        toast.error(error.message || "Error resending invitation.");
      },
    }),
  );

  const cancelInvitation = useMutation(
    trpc.authenticated.organization.invitation.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateList();
        toast.success("Invitation canceled");
      },
      onError: (error) => {
        toast.error(error.message || "Error canceling invitation.");
      },
    }),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={resendInvitation.isPending || cancelInvitation.isPending}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => resendInvitation.mutate({ invitationId })}
        >
          <Send className="size-4" />
          Resend invitation
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => cancelInvitation.mutate({ invitationId })}
          variant="destructive"
        >
          <X className="size-4" />
          Cancel invitation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
