/*
  Warnings:

  - You are about to drop the column `name` on the `shopping_items` table. All the data in the column will be lost.
  - Added the required column `ingredientId` to the `shopping_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "shopping_items" DROP COLUMN "name",
ADD COLUMN     "ingredientId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "shopping_items_ingredientId_idx" ON "shopping_items"("ingredientId");

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
