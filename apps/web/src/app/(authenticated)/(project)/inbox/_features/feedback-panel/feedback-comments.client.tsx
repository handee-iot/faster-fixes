"use client";

import type { ListFeedbackCommentsOutput } from "../../_services/list-feedback-comments";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { resolveS3Url } from "@/utils/url/resolve-s3-url";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Comment = ListFeedbackCommentsOutput[number];

type FeedbackCommentsProps = {
  feedbackId: string;
};

/**
 * The client conversation on a Feedback (ADR-0018): every comment in creation
 * order, plus a composer. Replies land in the widget for whoever holds the
 * Reviewer link.
 */
export function FeedbackComments({ feedbackId }: FeedbackCommentsProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const commentsQuery =
    trpc.authenticated.projects.feedback.listComments.queryOptions({
      feedbackId,
    });
  const { data: comments } = useQuery(commentsQuery);

  const createComment = useMutation(
    trpc.authenticated.projects.feedback.createComment.mutationOptions({
      onSuccess: async () => {
        setBody("");
        await queryClient.invalidateQueries({
          queryKey: commentsQuery.queryKey,
        });
      },
      onError: () => {
        toast.error("Failed to send message.");
      },
    }),
  );

  const items = comments ?? [];

  function handleSend() {
    const trimmed = body.trim();
    if (trimmed === "" || createComment.isPending) return;
    createComment.mutate({ feedbackId, body: trimmed });
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="size-4 text-muted-foreground" />
        Conversation
        {items.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            {items.length}
          </span>
        )}
      </h3>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">
          No messages yet. Replies appear in the feedback widget.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a reply..."
          rows={3}
          maxLength={4000}
          className="text-sm"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={body.trim() === "" || createComment.isPending}
          >
            <Send className="size-3.5" />
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}

type CommentRowProps = {
  comment: Comment;
};

function CommentRow({ comment }: CommentRowProps) {
  const name = comment.author?.name ?? "Unknown";
  const image = comment.author?.image ?? null;

  return (
    <li className="flex gap-2.5">
      <Avatar className="size-6 shrink-0">
        <AvatarImage
          src={image ? resolveS3Url(image) : undefined}
          className="object-cover"
        />
        <AvatarFallback className="text-[10px]">
          {name.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium">{name}</span>
          {comment.authorType === "reviewer" && (
            <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
              Client
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">
          {comment.body}
        </p>
      </div>
    </li>
  );
}
