import { createReviewerComment } from "@/app/_domains/feedback/_services/create-reviewer-comment";
import { listReviewerComments } from "@/app/_domains/feedback/_services/list-reviewer-comments";
import { checkRateLimit } from "@/server/rate-limit/check-rate-limit";
import { publicProcedure, router } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { PORTAL_REVIEWER_COOKIE } from "./_helpers/portal-reviewer-cookie";
import { CreatePortalCommentSchema } from "./_services/create-portal-comment.schema";
import { findPortalReviewer } from "./_services/find-portal-reviewer";
import { listPortalBoard } from "./_services/list-portal-board";
import { moveFeedbackColumn } from "./_services/move-feedback-column";
import { MoveFeedbackColumnSchema } from "./_services/move-feedback-column.schema";

/**
 * The request must resolve to an active Reviewer (ADR-0021): the signed-in
 * User's email, or the embed hand-off's cookie (ADR-0022). Every procedure
 * then scopes its reads and writes to that Reviewer's Project.
 */
const reviewerProcedure = publicProcedure.use(async (opts) => {
  const token = (await cookies()).get(PORTAL_REVIEWER_COOKIE)?.value;
  const reviewer = await findPortalReviewer({
    email: opts.ctx.session?.user.email,
    token,
  });

  if (!reviewer) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  const { allowed } = await checkRateLimit(reviewer.id, "trpc");
  if (!allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
  }

  return opts.next({ ctx: { reviewer } });
});

export const portalRouter = router({
  board: router({
    list: reviewerProcedure.query(({ ctx }) =>
      listPortalBoard({ projectId: ctx.reviewer.projectId }),
    ),
  }),
  feedback: router({
    comments: reviewerProcedure
      .input(z.object({ feedbackId: z.string() }))
      .query(({ ctx, input }) =>
        listReviewerComments({
          projectId: ctx.reviewer.projectId,
          feedbackId: input.feedbackId,
        }),
      ),
    createComment: reviewerProcedure
      .input(CreatePortalCommentSchema)
      .mutation(({ ctx, input }) =>
        createReviewerComment({
          projectId: ctx.reviewer.projectId,
          feedbackId: input.feedbackId,
          reviewerId: ctx.reviewer.id,
          body: input.body,
        }),
      ),
    moveColumn: reviewerProcedure
      .input(MoveFeedbackColumnSchema)
      .mutation(({ ctx, input }) =>
        moveFeedbackColumn({
          projectId: ctx.reviewer.projectId,
          feedbackId: input.feedbackId,
          columnId: input.columnId,
        }),
      ),
  }),
});
