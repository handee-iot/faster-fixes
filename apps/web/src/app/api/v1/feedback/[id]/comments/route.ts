/**
 * The widget API's HTTP boundary for a Feedback's comment thread: Project
 * resolution, the Allowed origins match, the Reviewer token, the rate limit,
 * the body parse and the `DomainError` mapping live here, so the `_services/`
 * functions below stay transport-agnostic.
 */

import { isAllowedOrigin } from "@/app/_domains/project/_helpers/is-allowed-origin";
import { findProjectByPublicId } from "@/app/_domains/project/_services/find-project-by-public-id";
import { findReviewerByToken } from "@/app/_domains/project/_services/find-reviewer-by-token";
import { checkRateLimit } from "@/server/rate-limit/check-rate-limit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { widgetErrorResponse } from "../../_helpers/widget-error-response";
import { createFeedbackComment } from "../../_services/create-feedback-comment";
import { CreateFeedbackCommentSchema } from "../../_services/create-feedback-comment.schema";
import { getProjectFeedback } from "../../_services/get-project-feedback";
import { listFeedbackComments } from "../../_services/list-feedback-comments";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/v1/feedback/:id/comments — the thread, oldest first
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const project = await findProjectByPublicId(req.headers.get("x-api-key"));
  if (!project) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAllowedOrigin(req.headers, project.domain)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const reviewerToken = req.headers.get("x-reviewer-token");
  const reviewer = await findReviewerByToken(reviewerToken, project.id);
  if (!reviewer) {
    return NextResponse.json(
      { error: "Invalid reviewer token" },
      { status: 403 },
    );
  }

  const { allowed } = await checkRateLimit(project.id, "read");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  try {
    // Existence first: an unknown Feedback answers 404, not an empty thread.
    await getProjectFeedback({ feedbackId: id, projectId: project.id });

    const comments = await listFeedbackComments({
      projectId: project.id,
      feedbackId: id,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    const response = widgetErrorResponse(error);
    if (!response) throw error;
    return response;
  }
}

// POST /api/v1/feedback/:id/comments — a Reviewer's reply
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const project = await findProjectByPublicId(req.headers.get("x-api-key"));
  if (!project) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAllowedOrigin(req.headers, project.domain)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const reviewerToken = req.headers.get("x-reviewer-token");
  const reviewer = await findReviewerByToken(reviewerToken, project.id);
  if (!reviewer) {
    return NextResponse.json(
      { error: "Invalid reviewer token" },
      { status: 403 },
    );
  }

  const { allowed } = await checkRateLimit(project.id, "submit");
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  try {
    // Existence comes before the body is read, as it always has: an unknown
    // Feedback with a broken payload answers 404, not 400.
    await getProjectFeedback({ feedbackId: id, projectId: project.id });

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CreateFeedbackCommentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.flattenError(parsed.error) },
        { status: 422 },
      );
    }

    const comment = await createFeedbackComment({
      projectId: project.id,
      feedbackId: id,
      reviewerId: reviewer.id,
      body: parsed.data.body,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    const response = widgetErrorResponse(error);
    if (!response) throw error;
    return response;
  }
}
