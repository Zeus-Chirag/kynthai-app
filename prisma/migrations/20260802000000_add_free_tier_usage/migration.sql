-- Create free_tier_usage table for daily usage tracking
CREATE TABLE IF NOT EXISTS "free_tier_usage" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "date" DATE NOT NULL,
    "medicines_added" INTEGER NOT NULL DEFAULT 0,
    "ai_chats_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: one row per user per date
CREATE UNIQUE INDEX IF NOT EXISTS "free_tier_usage_user_id_date_idx"
    ON "free_tier_usage"("user_id", "date");

-- Point-lookup index
CREATE INDEX IF NOT EXISTS "free_tier_usage_user_id_idx"
    ON "free_tier_usage"("user_id");
