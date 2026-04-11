-- CreateIndex
CREATE INDEX "ingredients_normalizedName_idx" ON "ingredients"("normalizedName");

-- CreateIndex
CREATE INDEX "ingredients_tsvName_idx" ON "ingredients"("tsvName");
