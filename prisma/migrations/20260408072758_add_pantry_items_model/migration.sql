-- CreateTable
CREATE TABLE "pantry_items" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "shopId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pantry_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pantry_items_userId_idx" ON "pantry_items"("userId");

-- CreateIndex
CREATE INDEX "pantry_items_ingredientId_idx" ON "pantry_items"("ingredientId");

-- CreateIndex
CREATE INDEX "pantry_items_expiresAt_idx" ON "pantry_items"("expiresAt");

-- CreateIndex
CREATE INDEX "pantry_items_shopId_idx" ON "pantry_items"("shopId");

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
