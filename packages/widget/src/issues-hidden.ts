import { STORAGE_KEY_ISSUES_HIDDEN } from "@fasterfixes/core";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** localStorage when the browser allows it; null in SSR or when storage is blocked. */
function defaultStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether the Reviewer has hidden the issues they logged. The choice sticks
 * across pages and visits, so the pins do not reappear under their feet: the
 * rail's eye control writes it, and the widget reads it on mount.
 */
export function readIssuesHidden(
  store: Store | null = defaultStore(),
): boolean {
  try {
    return store?.getItem(STORAGE_KEY_ISSUES_HIDDEN) === "1";
  } catch {
    return false;
  }
}

export function writeIssuesHidden(
  hidden: boolean,
  store: Store | null = defaultStore(),
): void {
  try {
    if (!store) return;
    if (hidden) store.setItem(STORAGE_KEY_ISSUES_HIDDEN, "1");
    else store.removeItem(STORAGE_KEY_ISSUES_HIDDEN);
  } catch {
    // A blocked or full store only costs the preference, never the widget.
  }
}
