-- DropIndex
DROP INDEX "verification_identifier_idx";

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_key" ON "verification"("identifier");
