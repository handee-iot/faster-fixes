"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

type ResendReviewerInviteButtonProps = {
  projectId: string;
  reviewerId: string;
  reviewerName: string;
};

export function ResendReviewerInviteButton({
  projectId,
  reviewerId,
  reviewerName,
}: ResendReviewerInviteButtonProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const resendInvite = useMutation(
    trpc.authenticated.projects.reviewer.resendInvite.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries(
          trpc.authenticated.projects.reviewer.list.queryOptions({ projectId }),
        );
        if (result.skipped === "no_reviewer_email") {
          toast.error(`${reviewerName} has no email on file.`);
          return;
        }
        // A Reviewer from before the links were recoverable gets a new one.
        toast.success(
          result.rotated
            ? `New link issued for ${reviewerName}; their old links no longer work.`
            : `Invite sent to ${reviewerName}.`,
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={resendInvite.isPending}
      onClick={() => resendInvite.mutate({ reviewerId })}
    >
      <Send className="size-4" />
      {resendInvite.isPending ? "Sending..." : "Resend invite"}
    </Button>
  );
}
