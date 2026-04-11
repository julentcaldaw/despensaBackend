-- CreateEnum
CREATE TYPE "Conservation" AS ENUM ('NEVERA', 'CONGELADOR', 'DESPENSA');

-- AlterTable
ALTER TABLE "pantry_items" ADD COLUMN     "conservacion" "Conservation" NOT NULL DEFAULT 'NEVERA';
