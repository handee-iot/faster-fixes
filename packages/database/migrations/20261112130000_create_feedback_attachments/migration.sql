-- CreateTable
CREATE TABLE "feedback_attachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "feedback_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_attachment_feedbackId_assetId_key" ON "feedback_attachment"("feedbackId", "assetId");

-- CreateIndex
CREATE INDEX "feedback_attachment_feedbackId_position_idx" ON "feedback_attachment"("feedbackId", "position");

-- AddForeignKey
ALTER TABLE "feedback_attachment" ADD CONSTRAINT "feedback_attachment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_attachment" ADD CONSTRAINT "feedback_attachment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
