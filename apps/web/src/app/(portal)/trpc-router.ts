import { createReviewerComment } from "@/app/_domains/feedback/_services/create-reviewer-comment";
import { listReviewerComments } from "@/app/_domains/feedback/_services/list-reviewer-comments";
import { findActiveReviewerByEmail } from "@/app/_domains/project/_services/find-active-reviewer-by-email";
import { protectedProcedure, router } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { CreatePortalCommentSchema } from "./_services/create-portal-comment.schema";
import { listPortalBoard } from "./_services/list-portal-board";
import { moveFeedbackColumn } from "./_services/move-feedback-column";
import { MoveFeedbackColumnSchema } from "./_services/move-feedback-column.schema";

/**
 * The session's User must be an active Reviewer (ADR-0021); every procedure
 * then scopes its reads and writes to that Reviewer's Project.
 */
const reviewerProcedure = protectedProcedure.use(async (opts) => {
  const reviewer = await findActiveReviewerByEmail(opts.ctx.session.user.email);

  if (!reviewer) {
    throw new TRPCError({ code: "FORBIDDEN" });
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
