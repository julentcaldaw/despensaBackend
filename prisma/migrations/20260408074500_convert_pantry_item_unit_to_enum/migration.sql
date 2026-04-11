-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('G', 'KG', 'ML', 'L', 'UNIT', 'PACK', 'CAN', 'BOTTLE', 'JAR', 'BOX', 'BAG', 'TBSP', 'TSP', 'SLICE', 'CLOVE');

-- AlterTable
ALTER TABLE "pantry_items"
ALTER COLUMN "unit" TYPE "Unit"
USING ("unit"::"Unit");
