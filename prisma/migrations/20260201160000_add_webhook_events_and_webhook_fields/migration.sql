-- This migration is intentionally idempotent (IF NOT EXISTS)
-- because these tables/columns may have been applied previously via `prisma db push`.

-- Add webhook testing/telemetry fields
ALTER TABLE "shopify_webhooks" ADD COLUMN IF NOT EXISTS "lastTriggeredAt" TIMESTAMP(3);
ALTER TABLE "shopify_webhooks" ADD COLUMN IF NOT EXISTS "lastTestedAt" TIMESTAMP(3);
ALTER TABLE "shopify_webhooks" ADD COLUMN IF NOT EXISTS "testStatus" TEXT NOT NULL DEFAULT 'not_tested';
ALTER TABLE "shopify_webhooks" ADD COLUMN IF NOT EXISTS "lastTestResult" JSONB;

-- Store all inbound webhook events for audit/debug
CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "shopifyWebhookId" TEXT,
  "payload" JSONB NOT NULL,
  "headers" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "webhook_events"
    ADD CONSTRAINT "webhook_events_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "webhook_events_organizationId_idx" ON "webhook_events"("organizationId");
CREATE INDEX IF NOT EXISTS "webhook_events_topic_idx" ON "webhook_events"("topic");
CREATE INDEX IF NOT EXISTS "webhook_events_processedAt_idx" ON "webhook_events"("processedAt");

