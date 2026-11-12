export type WidgetPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "middle-right"
  | "middle-left";

export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";

export type WidgetConfig = {
  enabled: boolean;
  branding: boolean;
};

export type FeedbackReviewer = {
  id: string;
  name: string;
};

/** A file on a Feedback or one of its comments, with a signed URL (ADR-0026). */
export type FileAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** A short-lived signed URL from the instance. */
  url: string;
};

export type FeedbackItem = {
  id: string;
  status: FeedbackStatus;
  /** The per-Project number (ADR-0020); omitted by sources that don't number. */
  number?: number;
  comment: string;
  pageUrl: string;
  clickX: number | null;
  clickY: number | null;
  selector: string | null;
  screenshotUrl: string | null;
  /** Files attached to the report itself, in order (ADR-0026). */
  attachments: FileAttachment[];
  /** How many comments the thread holds; omitted when the source cannot count. */
  commentCount?: number;
  reviewer: FeedbackReviewer;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

export type FeedbackListResponse = {
  feedback: FeedbackItem[];
};

export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

export type ConsoleEntry = {
  level: ConsoleLevel;
  message: string;
  timestamp: number;
};

export type NetworkEntry = {
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
};

export type DiagnosticTrail = {
  console: ConsoleEntry[];
  network: NetworkEntry[];
};

export type CreateFeedbackData = {
  comment: string;
  pageUrl: string;
  selector?: string;
  clickX?: number;
  clickY?: number;
  browserName?: string;
  browserVersion?: string;
  os?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  metadata?: Record<string, unknown>;
  diagnosticTrail?: DiagnosticTrail;
};

export type UpdateFeedbackData = {
  comment: string;
};

export type CreateFeedbackResponse = FeedbackItem;

export type UpdateFeedbackResponse = {
  id: string;
  comment: string;
  updatedAt: string;
};

export type FeedbackCommentAuthor = {
  id: string;
  name: string;
};

export type FeedbackCommentAttachment = FileAttachment;

export type FeedbackCommentItem = {
  id: string;
  createdAt: string;
  authorType: "reviewer" | "member";
  body: string;
  author: FeedbackCommentAuthor | null;
  /** Files attached to the comment, in order (ADR-0026). */
  attachments: FeedbackCommentAttachment[];
};

export type FeedbackCommentListResponse = {
  comments: FeedbackCommentItem[];
};

export type CreateCommentData = {
  body: string;
  /** Assets uploaded through the attachments endpoint, in order. */
  attachmentIds?: string[];
};

export type ApiErrorResponse = {
  error: string;
  details?: unknown;
};

/**
 * Common shape implemented by any feedback backend. The default
 * implementation is `FasterFixesClient` (HTTP against the hosted API);
 * alternative implementations can target localStorage, in-memory state,
 * or a mock for tests.
 */
export type FeedbackClient = {
  getConfig(): Promise<WidgetConfig>;
  getFeedback(
    reviewerToken: string,
    url?: string,
  ): Promise<FeedbackListResponse>;
  createFeedback(
    data: CreateFeedbackData,
    reviewerToken: string,
    screenshot?: Blob,
  ): Promise<CreateFeedbackResponse>;
  updateFeedback(
    id: string,
    data: UpdateFeedbackData,
    reviewerToken: string,
  ): Promise<UpdateFeedbackResponse>;
  deleteFeedback(id: string, reviewerToken: string): Promise<void>;
  attachScreenshot(
    feedbackId: string,
    screenshot: Blob,
    reviewerToken: string,
  ): Promise<void>;
  listComments(
    feedbackId: string,
    reviewerToken: string,
  ): Promise<FeedbackCommentListResponse>;
  createComment(
    feedbackId: string,
    data: CreateCommentData,
    reviewerToken: string,
  ): Promise<FeedbackCommentItem>;
  /** Uploads one file for a comment; the returned id is what the comment attaches. */
  uploadCommentAttachment(
    feedbackId: string,
    file: File,
    reviewerToken: string,
  ): Promise<FeedbackCommentAttachment>;
  /** Uploads one file for the report itself (the creation popover). */
  uploadFeedbackAttachment(
    feedbackId: string,
    file: File,
    reviewerToken: string,
  ): Promise<FileAttachment>;
};
