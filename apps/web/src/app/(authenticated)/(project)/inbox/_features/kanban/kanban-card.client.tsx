"use client";

import { useDraggable } from "@dnd-kit/core";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { GripVertical } from "lucide-react";
import { getWaitingDays, isWaitingTooLong } from "../../_helpers/board-summary";
import type { ListFeedbackOutput } from "../../_services/list-feedback";
import { getBoardStatusAppearance } from "./board-status-appearance";
import { AssigneeAvatar, TrackerChips, WaitingChip } from "./kanban-card-parts";

type FeedbackItem = ListFeedbackOutput[number];

type KanbanCardProps = {
  feedback: FeedbackItem;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (id: string) => void;
};

// The host is the same for every Feedback of a Project, so only the path helps.
function formatPagePath(url: string) {
  try {
    return new URL(url).pathname.replace(/\/$/, "") || "/";
  } catch {
    return url;
  }
}

type KanbanCardViewProps = {
  feedback: FeedbackItem;
  isSelected: boolean;
  selectionMode: boolean;
  isOverlay?: boolean;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
  onToggleSelect?: (id: string) => void;
  onSelect?: (id: string) => void;
};

// Pure presentational card. Used as draggable source and inside DragOverlay.
function KanbanCardView({
  feedback,
  isSelected,
  selectionMode,
  isOverlay,
  isDragging,
  dragHandle,
  onToggleSelect,
  onSelect,
}: KanbanCardViewProps) {
  const appearance = getBoardStatusAppearance(feedback.status);
  const StatusIcon = appearance.icon;
  const now = new Date();
  const isWaiting = isWaitingTooLong(feedback, now);
  const hasTracker = [
    feedback.issueLink,
    feedback.linearIssueLink,
    feedback.jiraIssueLink,
  ].some(Boolean);

  return (
    <div
      className={cn(
        "group flex cursor-pointer gap-2 rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-sm",
        isOverlay && "cursor-grabbing shadow-lg",
        // Source stays in flow but invisible; DragOverlay shows the moving copy.
        isDragging && "invisible",
      )}
      onClick={() => {
        if (isOverlay) return;
        onSelect?.(feedback.id);
      }}
    >
      {selectionMode && (
        <div
          className="flex items-start pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(feedback.id)}
          />
        </div>
      )}

      <StatusIcon
        className={cn("mt-0.5 size-4 shrink-0", appearance.iconClassName)}
      />

      <div className="min-w-0 flex-1">
        <p className="line-clamp-3 text-sm leading-snug">{feedback.comment}</p>

        <p className="mt-1 truncate text-xs text-muted-foreground">
          {formatPagePath(feedback.pageUrl)}
        </p>

        {(isWaiting || hasTracker) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isWaiting && (
              <WaitingChip days={getWaitingDays(feedback.createdAt, now)} />
            )}
            <TrackerChips feedback={feedback} />
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">{feedback.reviewer.name}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">
            {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
          </span>
          <div className="ml-auto shrink-0">
            <AssigneeAvatar assignee={feedback.assignee} />
          </div>
        </div>
      </div>

      {dragHandle}
    </div>
  );
}

export function KanbanCard({
  feedback,
  isSelected,
  selectionMode,
  onToggleSelect,
  onSelect,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: feedback.id,
    data: { feedback },
  });

  const handle = (
    <div
      className="hidden shrink-0 cursor-grab items-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 lg:flex"
      {...listeners}
      {...attributes}
    >
      <GripVertical className="size-4" />
    </div>
  );

  return (
    <div ref={setNodeRef}>
      <KanbanCardView
        feedback={feedback}
        isSelected={isSelected}
        selectionMode={selectionMode}
        isDragging={isDragging}
        dragHandle={handle}
        onToggleSelect={onToggleSelect}
        onSelect={onSelect}
      />
    </div>
  );
}

type KanbanCardOverlayProps = {
  feedback: FeedbackItem;
  isSelected: boolean;
  selectionMode: boolean;
};

export function KanbanCardOverlay({
  feedback,
  isSelected,
  selectionMode,
}: KanbanCardOverlayProps) {
  return (
    <KanbanCardView
      feedback={feedback}
      isSelected={isSelected}
      selectionMode={selectionMode}
      isOverlay
    />
  );
}
