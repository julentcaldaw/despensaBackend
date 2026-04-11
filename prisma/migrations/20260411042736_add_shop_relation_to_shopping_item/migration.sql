-- AlterTable
ALTER TABLE "shopping_items" ADD COLUMN     "shopId" INTEGER;

-- CreateIndex
CREATE INDEX "shopping_items_shopId_idx" ON "shopping_items"("shopId");

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
