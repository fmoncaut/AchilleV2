-- AlterTable
ALTER TABLE "Category" ADD COLUMN "legacyCategoryCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Category_legacyCategoryCode_key" ON "Category"("legacyCategoryCode");
