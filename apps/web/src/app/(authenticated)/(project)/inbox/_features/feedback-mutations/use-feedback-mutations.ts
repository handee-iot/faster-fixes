import type { ListFeedbackOutput } from "@/app/(authenticated)/(project)/inbox/_services/list-feedback";
import { useActiveProject } from "@/app/_domains/project/active-project/active-project-provider.client";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Optimistic twin of updateFeedbackStatuses (ADR-0017): a real status change
// drops the card into the first column of its new category.
function withStatus(
  feedback: ListFeedbackOutput[number],
  status: string,
): ListFeedbackOutput[number] {
  return feedback.status === status
    ? feedback
    : { ...feedback, status, columnId: null };
}

export function useFeedbackMutations() {
  const { activeProject } = useActiveProject();
  if (!activeProject) {
    throw new Error("useFeedbackMutations requires an active Project.");
  }
  const projectId = activeProject.id;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const feedbackQueryKey = trpc.authenticated.projects.feedback.list.queryKey({
    projectId,
  });
  const columnsQueryKey = trpc.authenticated.projects.boardColumn.list.queryKey(
    { projectId },
  );
  const newCountQueryKey =
    trpc.authenticated.projects.feedback.countNew.queryKey({ projectId });

  // The sidebar badge counts New Feedback, so every status change refreshes it.
  const invalidateAfterStatusChange = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: feedbackQueryKey }),
      queryClient.invalidateQueries({ queryKey: newCountQueryKey }),
    ]);

  const updateStatus = useMutation(
    trpc.authenticated.projects.feedback.updateStatus.mutationOptions({
      onMutate: async ({ feedbackId, status }) => {
        await queryClient.cancelQueries({ queryKey: feedbackQueryKey });
        const previous = queryClient.getQueryData(feedbackQueryKey);

        queryClient.setQueryData(
          feedbackQueryKey,
          (old: ListFeedbackOutput | undefined) =>
            old?.map((f) => (f.id === feedbackId ? withStatus(f, status) : f)),
        );

        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(feedbackQueryKey, context.previous);
        }
        toast.error("Failed to update status.");
      },
      onSettled: invalidateAfterStatusChange,
    }),
  );

  const bulkUpdateStatus = useMutation(
    trpc.authenticated.projects.feedback.updateManyStatus.mutationOptions({
      onMutate: async ({ feedbackIds, status }) => {
        await queryClient.cancelQueries({ queryKey: feedbackQueryKey });
        const previous = queryClient.getQueryData(feedbackQueryKey);
        const idSet = new Set(feedbackIds);

        queryClient.setQueryData(
          feedbackQueryKey,
          (old: ListFeedbackOutput | undefined) =>
            old?.map((f) => (idSet.has(f.id) ? withStatus(f, status) : f)),
        );

        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(feedbackQueryKey, context.previous);
        }
        toast.error("Failed to update status.");
      },
      onSettled: invalidateAfterStatusChange,
    }),
  );

  const updateColumn = useMutation(
    trpc.authenticated.projects.feedback.updateManyColumn.mutationOptions({
      onMutate: async ({ feedbackIds, columnId }) => {
        await queryClient.cancelQueries({ queryKey: feedbackQueryKey });
        const previous = queryClient.getQueryData(feedbackQueryKey);
        const column = queryClient
          .getQueryData(columnsQueryKey)
          ?.find((c) => c.id === columnId);
        const idSet = new Set(feedbackIds);

        if (column) {
          queryClient.setQueryData(
            feedbackQueryKey,
            (old: ListFeedbackOutput | undefined) =>
              old?.map((f) =>
                idSet.has(f.id)
                  ? { ...f, columnId, status: column.category }
                  : f,
              ),
          );
        }

        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(feedbackQueryKey, context.previous);
        }
        toast.error("Failed to move feedback.");
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: feedbackQueryKey }),
    }),
  );

  const updateAssignee = useMutation(
    trpc.authenticated.projects.feedback.updateAssignee.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: feedbackQueryKey }),
      onError: () => {
        toast.error("Failed to update assignee.");
      },
    }),
  );

  return {
    updateStatus: (feedbackId: string, status: string) =>
      updateStatus.mutate({
        feedbackId,
        status: status as "new" | "in_progress" | "resolved" | "closed",
      }),
    bulkUpdateStatus: (feedbackIds: string[], status: string) =>
      bulkUpdateStatus.mutate({
        feedbackIds,
        status: status as "new" | "in_progress" | "resolved" | "closed",
      }),
    updateColumn: (feedbackIds: string[], columnId: string) =>
      updateColumn.mutate({ feedbackIds, columnId }),
    updateAssignee: (feedbackId: string, assigneeId: string | null) =>
      updateAssignee.mutate({ feedbackId, assigneeId }),
  };
}
