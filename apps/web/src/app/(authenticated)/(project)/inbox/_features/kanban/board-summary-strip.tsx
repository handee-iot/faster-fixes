import { cn } from "@workspace/ui/lib/utils";
import type { ListFeedbackOutput } from "../../_services/list-feedback";
import {
  getBoardSummary,
  WAITING_THRESHOLD_DAYS,
} from "../../_helpers/board-summary";
import { getBoardColumnId } from "../../_helpers/get-board-column-id";
import { getBoardStatusAppearance } from "./board-status-appearance";
import { ColumnSelectCheckbox } from "./column-select-checkbox.client";
import type { BoardColumn } from "./kanban-board.client";

type BoardSummaryStripProps = {
  columns: readonly BoardColumn[];
  feedback: ListFeedbackOutput;
  selectedIds: Set<string>;
  onToggleSelectAll: (columnId: string, itemIds: string[]) => void;
};

export function BoardSummaryStrip({
  columns,
  feedback,
  selectedIds,
  onToggleSelectAll,
}: BoardSummaryStripProps) {
  const summary = getBoardSummary(feedback, new Date());
  // The status-level annotations belong to one lane each: the first New lane
  // and the first Resolved lane, by position (ADR-0017).
  const firstNewColumnId =
    columns.find((c) => c.category === "new")?.id ?? null;
  const firstResolvedColumnId =
    columns.find((c) => c.category === "resolved")?.id ?? null;

  const itemIdsByColumn = new Map<string, string[]>();
  for (const column of columns) itemIdsByColumn.set(column.id, []);
  for (const item of feedback) {
    const columnId = getBoardColumnId(item, columns);
    if (columnId) itemIdsByColumn.get(columnId)?.push(item.id);
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div
        className="grid divide-x"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(10rem, 1fr))`,
        }}
      >
        {columns.map((col) => {
          const appearance = getBoardStatusAppearance(col.category);
          const StatusIcon = appearance.icon;
          const itemIds = itemIdsByColumn.get(col.id) ?? [];

          return (
            <div key={col.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ColumnSelectCheckbox
                  className="mr-1"
                  columnTitle={col.title}
                  itemIds={itemIds}
                  selectedIds={selectedIds}
                  onToggle={() => onToggleSelectAll(col.id, itemIds)}
                />
                <StatusIcon
                  className={cn("size-3.5", appearance.iconClassName)}
                />
                {col.title}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {itemIds.length}
                </span>
                {col.id === firstNewColumnId &&
                  summary.unassignedNewCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {summary.unassignedNewCount} unassigned
                    </span>
                  )}
                {col.id === firstNewColumnId &&
                  summary.oldestNewWaitingDays >= WAITING_THRESHOLD_DAYS && (
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      oldest {summary.oldestNewWaitingDays}d
                    </span>
                  )}
                {col.id === firstResolvedColumnId && summary.total > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {summary.resolvedPercent}% of the board
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribution bar: one segment per lane, sized by its share. */}
      <div className="flex h-1 overflow-hidden rounded-b-lg bg-muted">
        {columns.map((col) => {
          const count = (itemIdsByColumn.get(col.id) ?? []).length;
          if (!count) return null;
          return (
            <div
              key={col.id}
              className={cn(
                "h-full",
                getBoardStatusAppearance(col.category).swatchClassName,
              )}
              style={{ width: `${(count / summary.total) * 100}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
