/**
 * The widget API's HTTP boundary for comment attachments (ADR-0026): the
 * caller may be a Reviewer (widget token, or the portal's session/hand-off
 * cookie) or a signed-in Member of the Feedback's organization; everything else
 * is refused before the file is read.
 */

import { PORTAL_REVIEWER_COOKIE } from "@/app/_domains/project/_helpers/portal-reviewer-cookie";
import { isAllowedOrigin } from "@/app/_domains/project/_helpers/is-allowed-origin";
import { findPortalReviewer } from "@/app/_domains/project/_services/find-portal-reviewer";
import { findProjectByPublicId } from "@/app/_domains/project/_services/find-project-by-public-id";
import { findReviewerByToken } from "@/app/_domains/project/_services/find-reviewer-by-token";
import { findUploadingMember } from "@/app/_domains/project/_services/find-uploading-member";
import { auth } from "@/server/auth";
import { checkRateLimit } from "@/server/rate-limit/check-rate-limit";
import {
  COMMENT_ATTACHMENT_MAX_BYTES,
  COMMENT_ATTACHMENT_TYPES,
} from "@fasterfixes/core";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createFeedbackAttachment } from "../../_services/create-feedback-attachment";
import { getFeedbackForAttachment } from "../../_services/get-feedback-for-attachment";

type RouteParams = { params: Promise<{ id: string }> };

type Feedback = NonNullable<
  Awaited<ReturnType<typeof getFeedbackForAttachment>>
>;

type Uploader = { uploadedById: string | null; reviewer: boolean };

const ALLOWED_TYPES: readonly string[] = COMMENT_ATTACHMENT_TYPES;

/** The widget's path: its Project id, the Reviewer's token, an allowed origin. */
async function widgetUploader(
  req: NextRequest,
  feedback: Feedback,
): Promise<Uploader | null> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;

  const keyedProject = await findProjectByPublicId(apiKey);
  if (keyedProject?.id !== feedback.projectId) return null;
  if (!isAllowedOrigin(req.headers, feedback.project.domain)) return null;

  const reviewer = await findReviewerByToken(
    req.headers.get("x-reviewer-token"),
    feedback.projectId,
  );
  return reviewer ? { uploadedById: null, reviewer: true } : null;
}

/** The portal's path when it has no session: its hand-off cookie. */
async function cookieUploader(feedback: Feedback): Promise<Uploader | null> {
  const token = (await cookies()).get(PORTAL_REVIEWER_COOKIE)?.value;
  if (!token) return null;

  const reviewer = await findPortalReviewer({ token });
  return reviewer?.projectId === feedback.projectId
    ? { uploadedById: null, reviewer: true }
    : null;
}

/** The dashboard's or the portal's path: a signed-in Member or Reviewer. */
async function sessionUploader(
  req: NextRequest,
  feedback: Feedback,
): Promise<Uploader | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;

  const member = await findUploadingMember({
    organizationId: feedback.project.organizationId,
    userId: session.user.id,
  });
  if (member) return { uploadedById: session.user.id, reviewer: false };

  const reviewer = await findPortalReviewer({ email: session.user.email });
  return reviewer?.projectId === feedback.projectId
    ? { uploadedById: null, reviewer: true }
    : null;
}

async function resolveUploader(
  req: NextRequest,
  feedback: Feedback,
): Promise<Uploader | null> {
  const widget = await widgetUploader(req, feedback);
  if (widget) return widget;

  const session = await sessionUploader(req, feedback);
  if (session) return session;

  return cookieUploader(feedback);
}

// POST /api/v1/feedback/:id/attachments — one file, uploaded before the comment
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const feedback = await getFeedbackForAttachment({ feedbackId: id });
  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  const uploader = await resolveUploader(req, feedback);
  if (!uploader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reviewer uploads share the widget's submit budget; Member uploads are
  // already bounded by their session.
  if (uploader.reviewer) {
    const { allowed } = await checkRateLimit(feedback.projectId, "submit");
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "That file type is not supported." },
      { status: 400 },
    );
  }

  const body = Buffer.from(await file.arrayBuffer());

  if (body.length === 0) {
    return NextResponse.json({ error: "The file is empty" }, { status: 400 });
  }

  if (body.length > COMMENT_ATTACHMENT_MAX_BYTES) {
    return NextResponse.json(
      { error: "Files are limited to 10MB" },
      { status: 413 },
    );
  }

  const attachment = await createFeedbackAttachment({
    feedbackId: feedback.id,
    filename: file.name || "attachment",
    mimeType: file.type,
    body,
    uploadedById: uploader.uploadedById,
  });

  return NextResponse.json(attachment, { status: 201 });
}
