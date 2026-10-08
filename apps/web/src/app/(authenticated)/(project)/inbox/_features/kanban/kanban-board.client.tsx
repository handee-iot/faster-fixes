"use client";

import type { FeedbackColumnCategory } from "@/app/_domains/feedback";
import { useFeedbackMutations } from "@/app/(authenticated)/(project)/inbox/_features/feedback-mutations/use-feedback-mutations";
import type { ListFeedbackColumnsOutput } from "@/app/(authenticated)/(project)/settings/_services/list-feedback-columns";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import * as React from "react";
import { BulkActionToolbar } from "../actions-toolbar/bulk-action-toolbar.client";
import type { ListFeedbackOutput } from "../../_services/list-feedback";
import { getBoardColumnId } from "../../_helpers/get-board-column-id";
import { BoardSummaryStrip } from "./board-summary-strip";
import { KanbanCardOverlay } from "./kanban-card.client";
import { KanbanColumnBody } from "./kanban-column.client";
import { KanbanMobile } from "./kanban-mobile.client";

type FeedbackItem = ListFeedbackOutput[number];

export type BoardColumn = {
  id: string;
  title: string;
  category: FeedbackColumnCategory;
};

type KanbanBoardProps = {
  feedback: FeedbackItem[];
  columns: ListFeedbackColumnsOutput;
  pageUrlFilter: string | null;
  sort: string;
  onSelectFeedback: (id: string) => void;
};

function sortFeedback(items: FeedbackItem[], sort: string): FeedbackItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "updated":
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      default: // newest
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });
}

export function KanbanBoard({
  feedback,
  columns,
  pageUrlFilter,
  sort,
  onSelectFeedback,
}: KanbanBoardProps) {
  const { bulkUpdateStatus, updateColumn } = useFeedbackMutations();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const boardColumns = React.useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        title: column.name,
        category: column.category,
      })),
    [columns],
  );

  const sensors = useSensors(
    // The whole card is the drag source, so a click must still open it: the
    // mouse drags only after moving, touch only after a long press (so the
    // board still scrolls).
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  // Filter out closed items and apply page URL filter
  const filtered = React.useMemo(() => {
    let items = feedback.filter((f) => f.status !== "closed");
    if (pageUrlFilter) {
      items = items.filter((f) => f.pageUrl === pageUrlFilter);
    }
    return items;
  }, [feedback, pageUrlFilter]);

  const grouped = React.useMemo(() => {
    const map: Record<string, FeedbackItem[]> = {};
    for (const column of boardColumns) map[column.id] = [];
    for (const item of filtered) {
      const columnId = getBoardColumnId(item, boardColumns);
      if (columnId) map[columnId]?.push(item);
    }
    // Sort each lane
    for (const [key, items] of Object.entries(map)) {
      map[key] = sortFeedback(items, sort);
    }
    return map;
  }, [filtered, boardColumns, sort]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const feedbackId = active.id as string;
    const columnId = over.id as string;

    const item = feedback.find((f) => f.id === feedbackId);
    if (!item || getBoardColumnId(item, boardColumns) === columnId) return;

    updateColumn([feedbackId], columnId);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeFeedback = activeId
    ? (feedback.find((f) => f.id === activeId) ?? null)
    : null;

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleSelectAll(_columnId: string, itemIds: string[]) {
    setSelectedIds((prev) => {
      const allSelected = itemIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of itemIds) next.delete(id);
      } else {
        for (const id of itemIds) next.add(id);
      }
      return next;
    });
  }

  function handleBulkMove(columnId: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    updateColumn(ids, columnId);
    setSelectedIds(new Set());
  }

  function handleBulkArchive() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkUpdateStatus(ids, "closed");
    setSelectedIds(new Set());
  }

  const bulkToolbar = (
    <BulkActionToolbar
      selectedItems={feedback.filter((f) => selectedIds.has(f.id))}
      columns={boardColumns}
      onMoveToColumn={handleBulkMove}
      onArchive={handleBulkArchive}
      onClearSelection={() => setSelectedIds(new Set())}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden lg:block">
        <BoardSummaryStrip
          columns={boardColumns}
          feedback={filtered}
          selectedIds={selectedIds}
          onToggleSelectAll={handleToggleSelectAll}
        />
      </div>

      <KanbanMobile
        columns={boardColumns}
        grouped={grouped}
        selectedIds={selectedIds}
        toolbar={bulkToolbar}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onSelectFeedback={onSelectFeedback}
      />

      <div className="hidden lg:block">{bulkToolbar}</div>

      {/* Desktop: columns with DnD. Lanes keep a minimum width and scroll
          horizontally so a project with many columns stays readable. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="hidden gap-4 overflow-x-auto pb-2 lg:flex">
          {boardColumns.map((column) => (
            <div key={column.id} className="flex min-w-64 flex-1">
              <KanbanColumnBody
                id={column.id}
                items={grouped[column.id] ?? []}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectFeedback={onSelectFeedback}
              />
            </div>
          ))}
        </div>
        {/* dropAnimation=null avoids the overlay sliding back to the source
            slot when the item has actually moved to another column. */}
        <DragOverlay dropAnimation={null}>
          {activeFeedback ? (
            <KanbanCardOverlay
              feedback={activeFeedback}
              isSelected={selectedIds.has(activeFeedback.id)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
