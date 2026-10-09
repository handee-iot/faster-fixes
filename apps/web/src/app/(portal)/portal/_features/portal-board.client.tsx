"use client";

import type { ListPortalBoardOutput } from "../../_services/list-portal-board";
import { signOut } from "@/lib/auth";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, LogOut, MapPin, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type BoardItem = ListPortalBoardOutput["feedback"][number];
type BoardColumn = ListPortalBoardOutput["columns"][number];

type PortalBoardProps = {
  projectName: string;
  siteUrl: string;
  reviewerName: string;
};

// The page a card names: the URL's path and query, or the raw value.
function pagePath(pageUrl: string) {
  try {
    const { pathname, search } = new URL(pageUrl);
    return `${pathname}${search}`;
  } catch {
    return pageUrl;
  }
}

/**
 * The reviewer's board (ADR-0021): the Project's columns and cards, a detail
 * drawer with the conversation, and column moves. Nothing else: no assignee,
 * no integrations, no settings.
 */
export function PortalBoard({
  projectName,
  siteUrl,
  reviewerName,
}: PortalBoardProps) {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.portal.board.list.queryOptions());
  const [openId, setOpenId] = useState<string | null>(null);

  const columns = data?.columns ?? [];
  const items = data?.feedback ?? [];
  const openItem = items.find((item) => item.id === openId) ?? null;

  // A card without a column sits in the first column of its status category.
  function columnOf(item: BoardItem) {
    if (item.columnId) return item.columnId;
    return (
      columns.find((column) => column.category === item.status)?.id ??
      columns[0]?.id ??
      null
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Feedback board</p>
          <h1 className="text-sm font-semibold">
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {projectName}
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{reviewerName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void signOut().then(() => window.location.reload());
            }}
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-start gap-4 overflow-x-auto p-6">
        {columns.map((column) => {
          const columnItems = items.filter(
            (item) => columnOf(item) === column.id,
          );
          return (
            <section
              key={column.id}
              className="flex w-72 shrink-0 flex-col gap-2"
            >
              <h2 className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground uppercase">
                {column.name}
                <span className="text-[11px] font-normal normal-case">
                  ({columnItems.length})
                </span>
              </h2>
              {columnItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenId(item.id)}
                  className="flex flex-col gap-1.5 rounded-md border bg-background p-3 text-left shadow-xs transition-colors hover:bg-accent/50"
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-px text-[11px] font-semibold text-muted-foreground">
                      #{item.number}
                    </span>
                    {item.commentCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MessageSquare className="size-3" />
                        {item.commentCount}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-3 text-sm">{item.comment}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.reviewer.name} ·{" "}
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </button>
              ))}
              {columnItems.length === 0 && (
                <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  Nothing here
                </p>
              )}
            </section>
          );
        })}
      </div>

      <Sheet
        open={openItem !== null}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
          {openItem && <PortalDetail item={openItem} columns={columns} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type PortalDetailProps = {
  item: BoardItem;
  columns: BoardColumn[];
};

function PortalDetail({ item, columns }: PortalDetailProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const commentsQuery = trpc.portal.feedback.comments.queryOptions({
    feedbackId: item.id,
  });
  const { data: comments } = useQuery(commentsQuery);

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.portal.board.list.queryKey(),
    });
  };

  const move = useMutation(
    trpc.portal.feedback.moveColumn.mutationOptions({
      onSuccess: invalidate,
      onError: () => {
        toast.error("Failed to move the card.");
      },
    }),
  );

  const createComment = useMutation(
    trpc.portal.feedback.createComment.mutationOptions({
      onSuccess: async () => {
        setBody("");
        await queryClient.invalidateQueries({
          queryKey: commentsQuery.queryKey,
        });
        await invalidate();
      },
      onError: () => {
        toast.error("Failed to send the message.");
      },
    }),
  );

  const currentColumnId =
    item.columnId ??
    columns.find((column) => column.category === item.status)?.id ??
    null;

  return (
    <>
      <SheetTitle className="sr-only">Feedback #{item.number}</SheetTitle>
      <SheetDescription className="sr-only">
        View and manage this feedback item
      </SheetDescription>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <span className="text-xs font-semibold text-muted-foreground">
            #{item.number}
          </span>
          {columns.map((column) => (
            <button
              key={column.id}
              type="button"
              disabled={move.isPending || column.id === currentColumnId}
              onClick={() =>
                move.mutate({ feedbackId: item.id, columnId: column.id })
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                column.id === currentColumnId
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "hover:bg-accent disabled:opacity-60",
              )}
            >
              {column.name}
            </button>
          ))}
        </div>

        <p className="text-base leading-snug font-semibold whitespace-pre-wrap">
          {item.comment}
        </p>

        {item.screenshotUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- screenshots come from the deployment's own storage host, which is not in the static remotePatterns allowlist
          <img
            src={item.screenshotUrl}
            alt=""
            className="w-full rounded-md border"
          />
        )}

        <p className="text-xs text-muted-foreground">
          Reported{" "}
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}{" "}
          by {item.reviewer.name}
        </p>

        <a
          href={item.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
        >
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{pagePath(item.pageUrl)}</span>
        </a>

        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">
            Comments
          </h3>
          {(comments ?? []).map((comment) => (
            <div key={comment.id} className="flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground">
                {comment.author?.name ?? "Unknown"}
              </span>
              <span className="text-sm whitespace-pre-wrap">
                {comment.body}
              </span>
            </div>
          ))}
          {(comments ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          )}

          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = body.trim();
              if (trimmed === "" || createComment.isPending) return;
              createComment.mutate({ feedbackId: item.id, body: trimmed });
            }}
          >
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write a comment..."
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
                Send
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
