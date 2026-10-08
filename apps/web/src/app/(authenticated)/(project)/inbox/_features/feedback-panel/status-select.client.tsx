"use client";

import { useFeedbackMutations } from "@/app/(authenticated)/(project)/inbox/_features/feedback-mutations/use-feedback-mutations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { getBoardColumnId } from "../../_helpers/get-board-column-id";
import { getBoardStatusAppearance } from "../kanban/board-status-appearance";

// Archive is a status, not a column, so it sits beside the board's columns
// under a value no column id can collide with (column ids are UUIDs).
const ARCHIVED_VALUE = "closed";

type StatusSelectProps = {
  feedback: { id: string; status: string; columnId: string | null };
  columns: readonly { id: string; name: string; category: string }[];
};

export function StatusSelect({ feedback, columns }: StatusSelectProps) {
  const { updateStatus, updateColumn } = useFeedbackMutations();

  const boardColumnId = getBoardColumnId(feedback, columns);
  const currentColumn = columns.find((c) => c.id === boardColumnId) ?? null;
  const isArchived = feedback.status === ARCHIVED_VALUE;
  const value = isArchived ? ARCHIVED_VALUE : (boardColumnId ?? "");
  const appearance = getBoardStatusAppearance(
    isArchived ? ARCHIVED_VALUE : (currentColumn?.category ?? feedback.status),
  );
  const StatusIcon = appearance.icon;
  const label = isArchived ? "Archived" : (currentColumn?.name ?? "Unassigned");
  const archivedAppearance = getBoardStatusAppearance(ARCHIVED_VALUE);
  const ArchivedIcon = archivedAppearance.icon;

  function handleChange(next: string) {
    if (next === ARCHIVED_VALUE) {
      updateStatus(feedback.id, ARCHIVED_VALUE);
    } else {
      updateColumn([feedback.id], next);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80",
            appearance.pillClassName,
          )}
        >
          <StatusIcon className="size-3.5" />
          {label}
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={handleChange}>
          {columns.map((column) => {
            const columnAppearance = getBoardStatusAppearance(column.category);
            const ColumnIcon = columnAppearance.icon;
            return (
              <DropdownMenuRadioItem key={column.id} value={column.id}>
                <ColumnIcon
                  className={cn("size-3.5", columnAppearance.iconClassName)}
                />
                {column.name}
              </DropdownMenuRadioItem>
            );
          })}
          <DropdownMenuRadioItem value={ARCHIVED_VALUE}>
            <ArchivedIcon
              className={cn("size-3.5", archivedAppearance.iconClassName)}
            />
            Archived
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
