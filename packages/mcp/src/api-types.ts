export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";

export type ListFeedbacksParams = {
  status?: string;
  page_url?: string;
  format?: "json" | "markdown";
};

export type FeedbackAttachmentJson = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** A short-lived signed URL; fetch it while it is fresh. */
  url: string;
  /** Whether the file was attached to the report or to a reply. */
  source: "feedback" | "comment";
  /** Set when source is "comment". */
  commentId: string | null;
};

export type FeedbackJson = {
  id: string;
  status: string;
  comment: string;
  pageUrl: string;
  selector: string | null;
  clickX: number | null;
  clickY: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  browserName: string | null;
  browserVersion: string | null;
  os: string | null;
  screenshotUrl: string | null;
  attachments: FeedbackAttachmentJson[];
  reviewerName: string;
  createdAt: string;
};

export type ListFeedbacksJsonResponse = {
  feedbacks: FeedbackJson[];
  count: number;
};

export type UpdateStatusResponse = {
  id: string;
  status: string;
  updatedAt: string;
};

export type CreateFeedbackInput = {
  comment: string;
  pageUrl: string;
  status?: FeedbackStatus;
  selector?: string;
  clickX?: number;
  clickY?: number;
  browserName?: string;
  browserVersion?: string;
  os?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

export type CreateFeedbacksParams = {
  feedbacks: CreateFeedbackInput[];
  reviewerName?: string;
  source?: string;
};

export type CreateFeedbacksResponse = {
  created: number;
  feedbacks: Array<{
    id: string;
    status: string;
    comment: string;
    pageUrl: string;
    createdAt: string;
  }>;
  reviewer: { id: string; name: string };
  atLimit: boolean;
};

export type ApiError = {
  error: string;
  code: string;
};
