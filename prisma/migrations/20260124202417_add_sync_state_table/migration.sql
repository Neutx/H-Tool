-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "shopify_cancellations" (
    "id" TEXT NOT NULL,
    "shopifyCancellationId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3) NOT NULL,
    "cancelReason" TEXT,
    "staffNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopify_returns" (
    "id" TEXT NOT NULL,
    "shopifyReturnId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopify_return_line_items" (
    "id" TEXT NOT NULL,
    "shopifyLineItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "returnId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_return_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopify_webhooks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shopifyWebhookId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_states" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lastCancellationSyncAt" TIMESTAMP(3),
    "lastReturnSyncAt" TIMESTAMP(3),
    "lastRefundSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopify_cancellations_shopifyCancellationId_key" ON "shopify_cancellations"("shopifyCancellationId");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_cancellations_shopifyOrderId_key" ON "shopify_cancellations"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "shopify_cancellations_shopifyOrderId_idx" ON "shopify_cancellations"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "shopify_cancellations_cancelledAt_idx" ON "shopify_cancellations"("cancelledAt");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_returns_shopifyReturnId_key" ON "shopify_returns"("shopifyReturnId");

-- CreateIndex
CREATE INDEX "shopify_returns_shopifyReturnId_idx" ON "shopify_returns"("shopifyReturnId");

-- CreateIndex
CREATE INDEX "shopify_returns_shopifyOrderId_idx" ON "shopify_returns"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "shopify_returns_requestedAt_idx" ON "shopify_returns"("requestedAt");

-- CreateIndex
CREATE INDEX "shopify_return_line_items_returnId_idx" ON "shopify_return_line_items"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_webhooks_shopifyWebhookId_key" ON "shopify_webhooks"("shopifyWebhookId");

-- CreateIndex
CREATE INDEX "shopify_webhooks_organizationId_idx" ON "shopify_webhooks"("organizationId");

-- CreateIndex
CREATE INDEX "shopify_webhooks_status_idx" ON "shopify_webhooks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_webhooks_organizationId_topic_key" ON "shopify_webhooks"("organizationId", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "sync_states_organizationId_key" ON "sync_states"("organizationId");

-- AddForeignKey
ALTER TABLE "shopify_cancellations" ADD CONSTRAINT "shopify_cancellations_shopifyOrderId_fkey" FOREIGN KEY ("shopifyOrderId") REFERENCES "orders"("shopifyOrderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopify_returns" ADD CONSTRAINT "shopify_returns_shopifyOrderId_fkey" FOREIGN KEY ("shopifyOrderId") REFERENCES "orders"("shopifyOrderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopify_return_line_items" ADD CONSTRAINT "shopify_return_line_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "shopify_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopify_webhooks" ADD CONSTRAINT "shopify_webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_states" ADD CONSTRAINT "sync_states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
