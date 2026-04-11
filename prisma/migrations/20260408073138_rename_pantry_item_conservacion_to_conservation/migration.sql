/*
  Warnings:

  - You are about to drop the column `conservacion` on the `pantry_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pantry_items" DROP COLUMN "conservacion",
ADD COLUMN     "conservation" "Conservation" NOT NULL DEFAULT 'NEVERA';
