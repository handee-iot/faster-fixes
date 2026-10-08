-- CreateTable
CREATE TABLE "feedback_comment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "reviewerId" TEXT,
    "memberId" TEXT,
    "body" TEXT NOT NULL,

    CONSTRAINT "feedback_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_comment_feedbackId_createdAt_idx" ON "feedback_comment"("feedbackId", "createdAt");

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
