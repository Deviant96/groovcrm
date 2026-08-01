-- AlterTable
ALTER TABLE "templates" ADD COLUMN "prospect_categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
