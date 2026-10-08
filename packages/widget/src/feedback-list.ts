import type {
  FeedbackCommentItem,
  FeedbackItem,
  Labels,
  WidgetPosition,
} from "@fasterfixes/core";

import { createIcon } from "./icons.js";
import { statusColor } from "./pins.js";

// Matches the `ff-list-exit-*` animations on `.list.closing`.
const LIST_EXIT_MS = 150;
const BRANDING_URL = "https://faster-fixes.com?ref=widget";

type FeedbackListOptions = {
  labels: Labels;
  position: WidgetPosition;
  branding: boolean;
};

type FeedbackListActions = {
  onSelect: (item: FeedbackItem) => void;
  /** The Feedback's thread, loaded when its row is expanded. */
  loadComments: (item: FeedbackItem) => Promise<readonly FeedbackCommentItem[]>;
  /** Stores a reply and resolves with the created comment. */
  createComment: (
    item: FeedbackItem,
    body: string,
  ) => Promise<FeedbackCommentItem>;
};

export type FeedbackList = {
  element: HTMLElement;
  /** Slides the panel in or out; the exit animation runs before it hides. */
  setOpen: (open: boolean) => void;
  /** Hides at once, without the exit animation. */
  close: () => void;
  readonly isOpen: boolean;
  render: (items: readonly FeedbackItem[]) => void;
};

/** The items a list row is rendered for: resolved and closed only on request. */
export function listedFeedback(
  items: readonly FeedbackItem[],
  showResolved: boolean,
) {
  if (showResolved) return items;
  return items.filter(
    (item) => item.status !== "resolved" && item.status !== "closed",
  );
}

/** The page a row names: the URL's path and query, or the raw value if unparsable. */
export function pagePath(pageUrl: string) {
  try {
    const { pathname, search } = new URL(pageUrl);
    return `${pathname}${search}`;
  } catch {
    return pageUrl;
  }
}

/**
 * Every Feedback item of the Project, beside the toolbar. Resolved and closed
 * items are hidden until the Reviewer asks for them.
 */
export function createFeedbackList(
  document: Document,
  { labels, position, branding }: FeedbackListOptions,
  { onSelect, loadComments, createComment }: FeedbackListActions,
): FeedbackList {
  const panel = document.createElement("div");
  panel.className = "list";
  panel.setAttribute("part", "list");
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", labels.feedbackListTitle);
  // Slides in from the screen edge the Widget is anchored to.
  panel.dataset.from = position.includes("right") ? "right" : "left";
  panel.hidden = true;

  const header = document.createElement("div");
  header.className = "list-header";
  const title = document.createElement("span");
  title.className = "list-title";
  title.textContent = labels.feedbackListTitle;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "list-toggle";
  header.append(title, toggle);

  const rows = document.createElement("ul");
  rows.className = "list-rows";

  const empty = document.createElement("p");
  empty.className = "list-empty";
  empty.textContent = labels.emptyList;

  panel.append(header, rows, empty);

  if (branding) {
    const footer = document.createElement("div");
    footer.className = "list-footer";
    const link = document.createElement("a");
    link.href = BRANDING_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = labels.brandingLink;
    footer.appendChild(link);
    panel.appendChild(footer);
  }

  let items: readonly FeedbackItem[] = [];
  let showResolved = false;
  let open = false;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  // Expansion and loaded threads outlive a re-render: `update` rebuilds rows.
  const expanded = new Set<string>();
  const threads = new Map<string, readonly FeedbackCommentItem[]>();

  function createRow(item: FeedbackItem) {
    const row = document.createElement("li");
    row.className = "list-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-item";
    button.setAttribute("part", "list-item");
    button.dataset.ffFeedbackId = item.id;

    const dot = document.createElement("span");
    dot.className = "status-dot";
    dot.style.backgroundColor = statusColor(item.status);
    dot.dataset.status = item.status;

    const text = document.createElement("span");
    text.className = "list-item-text";
    const comment = document.createElement("span");
    comment.className = "list-item-comment";
    comment.textContent = item.comment;
    const page = document.createElement("span");
    page.className = "list-item-page";
    page.textContent = pagePath(item.pageUrl);
    text.append(comment, page);

    button.append(dot, text);
    button.addEventListener("click", () => onSelect(item));

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "list-comments";
    toggle.setAttribute("aria-label", labels.commentsButton);
    toggle.setAttribute("aria-expanded", String(expanded.has(item.id)));
    toggle.title = labels.commentsButton;
    toggle.appendChild(createIcon(document, "message", 14));

    const thread = document.createElement("div");
    thread.className = "list-thread";
    thread.id = `ff-thread-${item.id}`;
    thread.hidden = !expanded.has(item.id);
    toggle.setAttribute("aria-controls", thread.id);

    let sending = false;

    function createComposer() {
      const form = document.createElement("form");
      form.className = "thread-composer";
      const input = document.createElement("textarea");
      input.className = "textarea thread-input";
      input.rows = 2;
      input.placeholder = labels.replyPlaceholder;
      input.setAttribute("aria-label", labels.replyPlaceholder);
      const send = document.createElement("button");
      send.type = "submit";
      send.className = "action action-primary thread-send";
      send.textContent = labels.sendButton;
      form.append(input, send);

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const body = input.value.trim();
        if (sending || body === "") return;
        sending = true;
        send.disabled = true;
        void createComment(item, body).then(
          (created) => {
            sending = false;
            const current = threads.get(item.id) ?? [];
            threads.set(item.id, [...current, created]);
            if (expanded.has(item.id)) renderThread();
          },
          () => {
            sending = false;
            send.disabled = false;
            form.querySelector(".thread-error")?.remove();
            const error = document.createElement("p");
            error.className = "thread-error";
            error.textContent = labels.errorMessage;
            form.appendChild(error);
          },
        );
      });

      return form;
    }

    function renderThread() {
      thread.replaceChildren();
      const comments = threads.get(item.id);
      // Still loading: the pending load renders once it resolves.
      if (!comments) return;

      if (comments.length === 0) {
        const empty = document.createElement("p");
        empty.className = "thread-empty";
        empty.textContent = labels.noComments;
        thread.appendChild(empty);
      } else {
        const list = document.createElement("ul");
        list.className = "thread-comments";
        for (const entry of comments) {
          const commentRow = document.createElement("li");
          commentRow.className = "thread-comment";
          const author = document.createElement("span");
          author.className = "thread-author";
          author.textContent = entry.author?.name ?? "";
          const body = document.createElement("span");
          body.className = "thread-body";
          body.textContent = entry.body;
          commentRow.append(author, body);
          list.appendChild(commentRow);
        }
        thread.appendChild(list);
      }

      thread.appendChild(createComposer());
    }

    function loadThread() {
      void loadComments(item).then(
        (comments) => {
          threads.set(item.id, comments);
          if (expanded.has(item.id)) renderThread();
        },
        () => {
          if (!expanded.has(item.id)) return;
          const error = document.createElement("p");
          error.className = "thread-error";
          error.textContent = labels.errorMessage;
          thread.replaceChildren(error);
        },
      );
    }

    toggle.addEventListener("click", () => {
      const next = !expanded.has(item.id);
      if (next) expanded.add(item.id);
      else expanded.delete(item.id);
      toggle.setAttribute("aria-expanded", String(next));
      thread.hidden = !next;
      if (!next) return;
      // A failed load is not cached, so expanding again retries it.
      if (threads.has(item.id)) renderThread();
      else loadThread();
    });

    row.append(button, toggle, thread);
    if (expanded.has(item.id)) {
      if (threads.has(item.id)) renderThread();
      else loadThread();
    }
    return row;
  }

  function update() {
    toggle.textContent = showResolved
      ? labels.hideResolved
      : labels.showResolved;
    toggle.setAttribute("aria-pressed", String(showResolved));
    const visible = listedFeedback(items, showResolved);
    rows.replaceChildren(...visible.map(createRow));
    rows.hidden = visible.length === 0;
    empty.hidden = visible.length > 0;
  }

  function clearCloseTimer() {
    if (closeTimer !== null) clearTimeout(closeTimer);
    closeTimer = null;
  }

  function close() {
    clearCloseTimer();
    open = false;
    panel.hidden = true;
    panel.classList.remove("closing");
  }

  toggle.addEventListener("click", () => {
    showResolved = !showResolved;
    update();
  });

  update();

  return {
    element: panel,
    setOpen(next) {
      if (next === open) return;
      clearCloseTimer();
      open = next;
      panel.classList.toggle("closing", !next);
      if (next) panel.hidden = false;
      else closeTimer = setTimeout(close, LIST_EXIT_MS);
    },
    close,
    get isOpen() {
      return open;
    },
    render(next) {
      items = next;
      update();
    },
  };
}
