"use client";

import { useDroppable } from "@dnd-kit/core";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";
import type { ListFeedbackOutput } from "../../_services/list-feedback";
import { getBoardStatusAppearance } from "./board-status-appearance";
import { KanbanCard } from "./kanban-card.client";
import { getColumnSelectionState } from "./column-selection-state";

type FeedbackItem = ListFeedbackOutput[number];

type KanbanColumnHeaderProps = {
  id: string;
  title: string;
  count: number;
  selectedIds: Set<string>;
  itemIds: string[];
  onToggleSelectAll: (columnId: string, itemIds: string[]) => void;
};

export function KanbanColumnHeader({
  id,
  title,
  count,
  selectedIds,
  itemIds,
  onToggleSelectAll,
}: KanbanColumnHeaderProps) {
  const appearance = getBoardStatusAppearance(id);
  const StatusIcon = appearance.icon;

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={getColumnSelectionState(itemIds, selectedIds)}
        onCheckedChange={() => onToggleSelectAll(id, itemIds)}
      />
      <StatusIcon className={cn("size-4", appearance.iconClassName)} />
      <h3 className="text-sm font-medium">{title}</h3>
      <span className="text-sm text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  );
}

type KanbanColumnBodyProps = {
  id: string;
  items: FeedbackItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectFeedback: (id: string) => void;
};

export function KanbanColumnBody({
  id,
  items,
  selectedIds,
  onToggleSelect,
  onSelectFeedback,
}: KanbanColumnBodyProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
        isOver
          ? "border-primary/50 bg-primary/5"
          : "border-transparent bg-muted/50",
      )}
    >
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No items
        </div>
      ) : (
        items.map((feedback) => (
          <KanbanCard
            key={feedback.id}
            feedback={feedback}
            isSelected={selectedIds.has(feedback.id)}
            selectionMode={selectedIds.size > 0}
            onToggleSelect={onToggleSelect}
            onSelect={onSelectFeedback}
          />
        ))
      )}
    </div>
  );
}
