-- CreateTable
CREATE TABLE "feedback_comment_attachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "feedback_comment_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_comment_attachment_commentId_assetId_key" ON "feedback_comment_attachment"("commentId", "assetId");

-- CreateIndex
CREATE INDEX "feedback_comment_attachment_commentId_position_idx" ON "feedback_comment_attachment"("commentId", "position");

-- AddForeignKey
ALTER TABLE "feedback_comment_attachment" ADD CONSTRAINT "feedback_comment_attachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "feedback_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comment_attachment" ADD CONSTRAINT "feedback_comment_attachment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
