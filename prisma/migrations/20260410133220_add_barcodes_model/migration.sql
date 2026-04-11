-- CreateTable
CREATE TABLE "barcodes" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "ingredientId" INTEGER NOT NULL,

    CONSTRAINT "barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barcodes_value_key" ON "barcodes"("value");

-- CreateIndex
CREATE INDEX "barcodes_ingredientId_idx" ON "barcodes"("ingredientId");

-- AddForeignKey
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
