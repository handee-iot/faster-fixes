// Mirrors the server rule (ADR-0017): a null or stale columnId lands the card
// in the first column, by position, of its status category. Columns arrive
// sorted by position.
export function getBoardColumnId(
  feedback: { columnId: string | null; status: string },
  columns: readonly { id: string; category: string }[],
): string | null {
  const pinned = columns.find(
    (c) => c.id === feedback.columnId && c.category === feedback.status,
  );
  if (pinned) return pinned.id;
  return columns.find((c) => c.category === feedback.status)?.id ?? null;
}
