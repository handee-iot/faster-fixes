-- AlterTable
ALTER TABLE "project" ADD COLUMN     "feedbackSequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "number" INTEGER;

-- Backfill: number each Project's existing Feedback in creation order, then
-- move each Project's sequence up to its highest number.
UPDATE "feedback" SET "number" = numbered.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt", "id") AS rn
  FROM "feedback"
) AS numbered
WHERE "feedback"."id" = numbered.id;

UPDATE "project" SET "feedbackSequence" = COALESCE(
  (SELECT MAX("feedback"."number") FROM "feedback" WHERE "feedback"."projectId" = "project"."id"),
  0
);

ALTER TABLE "feedback" ALTER COLUMN "number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "feedback_projectId_number_key" ON "feedback"("projectId", "number");
