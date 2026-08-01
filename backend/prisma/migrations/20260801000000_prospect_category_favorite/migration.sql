-- AlterTable
ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "favorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prospects_favorite_idx" ON "prospects"("favorite");
CREATE INDEX IF NOT EXISTS "prospects_category_idx" ON "prospects"("category");
