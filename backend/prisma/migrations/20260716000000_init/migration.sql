-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'SENT', 'REPLIED', 'INTERESTED', 'MEETING', 'PROPOSAL', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('WEBSITE_OFFER', 'SEO', 'BRANDING', 'MAINTENANCE', 'FOLLOW_UP', 'GENERAL');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('IMPORTED', 'EDITED', 'STATUS_CHANGED', 'MESSAGE_GENERATED', 'FOLLOW_UP_CHANGED', 'TEMPLATE_USED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "instagram_handle" TEXT,
    "website" TEXT,
    "phone_number" TEXT,
    "source_url" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "has_website" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "follow_up_date" TIMESTAMP(3),
    "last_contact_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL DEFAULT 'GENERAL',
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "prospects_company_name_idx" ON "prospects"("company_name");

-- CreateIndex
CREATE INDEX "prospects_instagram_handle_idx" ON "prospects"("instagram_handle");

-- CreateIndex
CREATE INDEX "prospects_website_idx" ON "prospects"("website");

-- CreateIndex
CREATE INDEX "prospects_phone_number_idx" ON "prospects"("phone_number");

-- CreateIndex
CREATE INDEX "prospects_status_idx" ON "prospects"("status");

-- CreateIndex
CREATE INDEX "prospects_follow_up_date_idx" ON "prospects"("follow_up_date");

-- CreateIndex
CREATE INDEX "prospects_score_idx" ON "prospects"("score");

-- CreateIndex
CREATE INDEX "templates_category_idx" ON "templates"("category");

-- CreateIndex
CREATE INDEX "notes_prospect_id_idx" ON "notes"("prospect_id");

-- CreateIndex
CREATE INDEX "activities_prospect_id_idx" ON "activities"("prospect_id");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE INDEX "activities_created_at_idx" ON "activities"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
