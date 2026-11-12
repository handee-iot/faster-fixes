# ADR-0026: Comments carry file attachments

- **Status**: Accepted
- **Date**: 2026-11-12

## Context

The thread on a Feedback took text only. Clients and the team routinely need
to send a screenshot, a PDF or a spreadsheet with a reply ("here is the export
that breaks"), and the only place a file could go was the Feedback's single
screenshot, which is captured at submission time.

## Decision

- A comment may carry up to **three** files, each up to **10MB**, from an
  allowlist (images, PDF, text/CSV, Word, Excel, ZIP). The limits and the type
  list live in `@fasterfixes/core` so the API and every composer agree.
- The file is uploaded **through the instance** (`POST
/api/v1/feedback/:id/attachments`, multipart) before the comment is sent. The
  route accepts a Reviewer (widget token, portal session, or the portal's
  hand-off cookie) or a Member of the Feedback's organization; everyone else is
  refused before the body is read.
- The upload records an `Asset` under `comment-attachments/<feedbackId>/…`, and
  the comment names the asset ids it takes. `linkCommentAttachments` refuses an
  id whose key is outside the Feedback's prefix or that already sits on another
  comment, so a guessed id cannot attach someone else's upload.
- A comment may be files only: the body is optional when attachments exist.
- Reads return each attachment with a short-lived signed URL, so the bucket
  does not have to be public.
- Deleting a Feedback deletes its comments' attachment assets with the
  screenshot.

## Alternatives considered

- **Better Upload's presigned browser upload** (used for organization logos):
  would need a second upload client in the widget IIFE, whose size is already
  near its ceiling, and a hand-rolled protocol just for the widget.
- **Attachments as part of the Feedback instead of the comment**: loses which
  reply a file belongs to, and every file would look like part of the report.
- **A public bucket URL**: the existing screenshots are public, but comment
  attachments are client files; signed URLs keep them private without extra
  infrastructure.

## Consequences

- Uploads flow through the app (10MB, three at a time), which is fine for
  comment-sized files; large assets still belong in a linked document.
- The widget, portal and dashboard all share one endpoint and one set of limits,
  so the three composers cannot drift.
- The widget IIFE grows by ~3.3KB for the composer and the client method; the
  build ceiling moves with it.

## Follow-up: the report itself carries files (12 Nov)

The creation popover ("Describe the issue...") took text only, so a Reviewer
who wanted to send a screenshot or a PDF had to submit first and reply. The same
endpoint now takes `?scope=feedback`: the file is stored under
`feedback-attachments/<feedbackId>/` and `linkFeedbackAttachments` guards that
prefix exactly as the comment path does, appending the Asset to
`FeedbackAttachment` in order.

The Feedback does not exist until the report is saved, so the widget creates it
first and uploads afterwards, like the screenshot. Those uploads are
best-effort: a failure logs a warning and never shows the submit as an error,
which would tempt a retry into a duplicate report. The widget, dashboard and
portal render the files under the report body with signed URLs, and deleting
the Feedback frees them with the rest.
