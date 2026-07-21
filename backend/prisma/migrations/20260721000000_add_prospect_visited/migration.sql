-- AlterTable
ALTER TABLE "prospects" ADD COLUMN "visited" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "prospects_visited_idx" ON "prospects"("visited");
