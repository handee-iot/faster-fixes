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
  /** The page the Widget is open on, read per render (client-side routing). */
  currentPageUrl: () => string;
};

type FeedbackListActions = {
  /** Scrolls to the item's pin, or navigates to its page when elsewhere. */
  onSelect: (item: FeedbackItem) => void;
  /** The Feedback's thread, loaded when its detail opens. */
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

/** The items submitted on one page, for the list's "This page" tab. */
export function pageItems(items: readonly FeedbackItem[], pageUrl: string) {
  return items.filter((item) => item.pageUrl === pageUrl);
}

/** "in_progress" reads as "in progress" in the detail's status pill. */
export function statusLabel(status: string) {
  return status.replace(/_/g, " ");
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

// "Oct 6, 2026, 1:15 PM"; the raw value when it is not a date.
function formatWhen(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * The Reviewer's view of the Project's Feedback: a list screen (This page /
 * All, resolved hidden until asked for) and a detail screen per item with the
 * screenshot, location and comment thread.
 */
export function createFeedbackList(
  document: Document,
  { labels, position, branding, currentPageUrl }: FeedbackListOptions,
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

  const listScreen = document.createElement("div");
  listScreen.className = "list-screen";

  const header = document.createElement("div");
  header.className = "list-header";
  const title = document.createElement("span");
  title.className = "list-title";
  title.textContent = labels.feedbackListTitle;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "list-toggle";
  header.append(title, toggle);

  const tabs = document.createElement("div");
  tabs.className = "list-tabs";
  const thisPageTab = document.createElement("button");
  thisPageTab.type = "button";
  thisPageTab.className = "list-tab";
  const allTab = document.createElement("button");
  allTab.type = "button";
  allTab.className = "list-tab";
  tabs.append(thisPageTab, allTab);

  const rows = document.createElement("ul");
  rows.className = "list-rows";

  const empty = document.createElement("p");
  empty.className = "list-empty";
  empty.textContent = labels.emptyList;

  listScreen.append(header, tabs, rows, empty);

  const detail = document.createElement("div");
  detail.className = "list-detail";
  detail.hidden = true;

  panel.append(listScreen, detail);

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
  let tab: "page" | "all" = "page";
  let tabInitialized = false;
  let detailId: string | null = null;
  let detailRenderedId: string | null = null;
  let sending = false;
  let open = false;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  // Loaded threads outlive re-renders; keyed by Feedback id.
  const threads = new Map<string, readonly FeedbackCommentItem[]>();
  // In-flight thread loads, so a re-render cannot stack duplicate requests.
  const loadingThreads = new Set<string>();

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

    if (item.commentCount) {
      const marker = document.createElement("span");
      marker.className = "list-item-comments";
      marker.title = labels.commentsTitle;
      marker.appendChild(createIcon(document, "message", 13));
      button.appendChild(marker);
    }

    button.addEventListener("click", () => {
      detailId = item.id;
      update();
    });
    row.appendChild(button);
    return row;
  }

  function createComposer(item: FeedbackItem, container: HTMLElement) {
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
          if (detailId === item.id) renderThread(item, container);
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

  function renderThread(item: FeedbackItem, container: HTMLElement) {
    container.replaceChildren();
    const comments = threads.get(item.id);
    // Still loading: the pending load renders once it resolves.
    if (!comments) return;

    if (comments.length === 0) {
      const emptyThread = document.createElement("p");
      emptyThread.className = "thread-empty";
      emptyThread.textContent = labels.noComments;
      container.appendChild(emptyThread);
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
      container.appendChild(list);
    }

    container.appendChild(createComposer(item, container));
  }

  function loadThread(item: FeedbackItem, container: HTMLElement) {
    if (loadingThreads.has(item.id)) return;
    loadingThreads.add(item.id);
    void loadComments(item).then(
      (comments) => {
        loadingThreads.delete(item.id);
        threads.set(item.id, comments);
        if (detailId === item.id) renderThread(item, container);
      },
      () => {
        loadingThreads.delete(item.id);
        if (detailId !== item.id) return;
        const error = document.createElement("p");
        error.className = "thread-error";
        error.textContent = labels.errorMessage;
        container.replaceChildren(error);
      },
    );
  }

  function renderDetail(item: FeedbackItem) {
    detail.replaceChildren();

    const detailHeader = document.createElement("div");
    detailHeader.className = "detail-header";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "detail-back";
    back.textContent = labels.backButton;
    back.addEventListener("click", () => {
      detailId = null;
      update();
    });
    const status = document.createElement("span");
    status.className = "detail-status";
    const statusDot = document.createElement("span");
    statusDot.className = "status-dot";
    statusDot.style.backgroundColor = statusColor(item.status);
    const statusText = document.createElement("span");
    statusText.textContent = statusLabel(item.status);
    status.append(statusDot, statusText);
    detailHeader.append(back, status);

    const body = document.createElement("div");
    body.className = "detail-body";

    const comment = document.createElement("p");
    comment.className = "detail-comment";
    comment.textContent = item.comment;
    body.appendChild(comment);

    if (item.screenshotUrl) {
      const shot = document.createElement("button");
      shot.type = "button";
      shot.className = "detail-shot";
      shot.setAttribute("aria-label", labels.viewScreenshot);
      const image = document.createElement("img");
      image.src = item.screenshotUrl;
      image.alt = "";
      image.loading = "lazy";
      shot.appendChild(image);
      shot.addEventListener("click", () => {
        if (item.screenshotUrl) {
          window.open(item.screenshotUrl, "_blank", "noopener,noreferrer");
        }
      });
      body.appendChild(shot);
    }

    const meta = document.createElement("p");
    meta.className = "detail-meta";
    meta.textContent = labels.reportedBy(
      formatWhen(item.createdAt),
      item.reviewer.name,
    );
    body.appendChild(meta);

    const location = document.createElement("div");
    location.className = "detail-location";
    const locationPath = document.createElement("span");
    locationPath.className = "detail-location-path";
    locationPath.textContent = pagePath(item.pageUrl);
    const locate = document.createElement("button");
    locate.type = "button";
    locate.className = "detail-locate";
    locate.textContent = labels.showOnPage;
    locate.addEventListener("click", () => onSelect(item));
    location.append(locationPath, locate);
    body.appendChild(location);

    const commentsTitle = document.createElement("p");
    commentsTitle.className = "detail-comments-title";
    commentsTitle.textContent = labels.commentsTitle;
    body.appendChild(commentsTitle);

    const thread = document.createElement("div");
    thread.className = "detail-thread";
    body.appendChild(thread);
    if (threads.has(item.id)) renderThread(item, thread);
    else loadThread(item, thread);

    detail.append(detailHeader, body);
  }

  function update() {
    const url = currentPageUrl();
    if (!tabInitialized) {
      // Open on the page's own feedback; fall back to All when it has none.
      tab = pageItems(items, url).length > 0 ? "page" : "all";
      tabInitialized = true;
    }

    toggle.textContent = showResolved
      ? labels.hideResolved
      : labels.showResolved;
    toggle.setAttribute("aria-pressed", String(showResolved));

    const openItem = detailId
      ? (items.find((item) => item.id === detailId) ?? null)
      : null;
    if (detailId && !openItem) detailId = null;

    listScreen.hidden = openItem !== null;
    detail.hidden = openItem === null;
    if (openItem) {
      // Rendered once per open, so a background re-render cannot wipe a
      // half-typed reply.
      if (detailRenderedId !== openItem.id) {
        detailRenderedId = openItem.id;
        renderDetail(openItem);
      }
      return;
    }
    detailRenderedId = null;

    thisPageTab.textContent = `${labels.thisPageTab} (${pageItems(items, url).length})`;
    allTab.textContent = `${labels.allTab} (${items.length})`;
    thisPageTab.setAttribute("aria-pressed", String(tab === "page"));
    allTab.setAttribute("aria-pressed", String(tab === "all"));

    const inTab = tab === "page" ? pageItems(items, url) : items;
    const visible = listedFeedback(inTab, showResolved);
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

  thisPageTab.addEventListener("click", () => {
    tab = "page";
    update();
  });

  allTab.addEventListener("click", () => {
    tab = "all";
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
