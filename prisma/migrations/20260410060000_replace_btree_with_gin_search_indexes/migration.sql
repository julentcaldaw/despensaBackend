-- Drop existing BTree indexes created in previous migration
DROP INDEX IF EXISTS "ingredients_normalizedName_idx";
DROP INDEX IF EXISTS "ingredients_tsvName_idx";

-- Enable pg_trgm extension for trigram-based similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on normalizedName using trigram operator class
-- Enables fast ILIKE '%query%' searches benefiting from GIN structure
CREATE INDEX "ingredients_normalizedName_gin_trgm_idx" ON "ingredients" USING GIN ("normalizedName" gin_trgm_ops);

-- GIN index on tsvName (text column) cast to tsvector at index time
-- Enables fast full-text @@ operator searches
CREATE INDEX "ingredients_tsvName_gin_idx" ON "ingredients" USING GIN (("tsvName"::tsvector));
