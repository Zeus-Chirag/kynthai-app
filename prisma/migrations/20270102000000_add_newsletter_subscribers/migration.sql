-- Create newsletter_subscribers table for landing-page waitlist signups
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "source" VARCHAR,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique email: subscribing twice is a no-op (upsert in the API route)
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_key"
    ON "newsletter_subscribers"("email");

-- Recency-sorted listing index
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_created_at_idx"
    ON "newsletter_subscribers"("created_at");
