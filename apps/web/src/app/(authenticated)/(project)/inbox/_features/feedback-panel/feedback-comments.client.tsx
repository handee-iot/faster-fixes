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
import {
  COMMENT_ATTACHMENT_MAX_BYTES,
  COMMENT_ATTACHMENT_MAX_FILES,
  COMMENT_ATTACHMENT_TYPES,
} from "@fasterfixes/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Comment = ListFeedbackCommentsOutput[number];

type FeedbackCommentsProps = {
  feedbackId: string;
};

/**
 * The client conversation on a Feedback (ADR-0018): every comment in creation
 * order, plus a composer that takes files as well as text (ADR-0026). Replies
 * land in the widget for whoever holds the Reviewer link.
 */
export function FeedbackComments({ feedbackId }: FeedbackCommentsProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commentsQuery =
    trpc.authenticated.projects.feedback.listComments.queryOptions({
      feedbackId,
    });
  const { data: comments } = useQuery(commentsQuery);

  const createComment = useMutation(
    trpc.authenticated.projects.feedback.createComment.mutationOptions({
      onSuccess: async () => {
        setBody("");
        setFiles([]);
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
  const busy = createComment.isPending || uploading;

  function addFiles(selected: File[]) {
    setFiles((current) => {
      const next = [...current];
      for (const file of selected) {
        if (next.length >= COMMENT_ATTACHMENT_MAX_FILES) break;
        if (file.size > COMMENT_ATTACHMENT_MAX_BYTES) continue;
        next.push(file);
      }
      return next;
    });
  }

  async function handleSend() {
    const trimmed = body.trim();
    if ((trimmed === "" && files.length === 0) || busy) return;
    try {
      setUploading(true);
      const attachmentIds: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(
          `/api/v1/feedback/${feedbackId}/attachments`,
          { method: "POST", body: formData },
        );
        if (!response.ok) throw new Error("Upload failed");
        const uploaded = (await response.json()) as { id: string };
        attachmentIds.push(uploaded.id);
      }
      createComment.mutate({ feedbackId, body: trimmed, attachmentIds });
    } catch {
      toast.error("Could not upload one of the files.");
    } finally {
      setUploading(false);
    }
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
          void handleSend();
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

        {files.length > 0 && (
          <ul className="flex flex-col gap-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded bg-muted px-2 py-1 text-xs"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, item) => item !== index),
                    )
                  }
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept={COMMENT_ATTACHMENT_TYPES.join(",")}
            onChange={(event) => {
              addFiles([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || files.length >= COMMENT_ATTACHMENT_MAX_FILES}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-3.5" />
            Attach
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={(body.trim() === "" && files.length === 0) || busy}
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
        {comment.body !== "" && (
          <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">
            {comment.body}
          </p>
        )}
        {comment.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {comment.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground hover:underline"
              >
                <Paperclip className="size-3 shrink-0" />
                <span className="truncate">{attachment.filename}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
