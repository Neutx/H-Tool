-- Drop foreign key constraints that reference shopifyOrderId
ALTER TABLE "shopify_cancellations" DROP CONSTRAINT IF EXISTS "shopify_cancellations_shopifyOrderId_fkey";
ALTER TABLE "shopify_returns" DROP CONSTRAINT IF EXISTS "shopify_returns_shopifyOrderId_fkey";

-- AlterTable: Change shopifyOrderId in orders table from String to BigInt
ALTER TABLE "orders" 
ALTER COLUMN "shopifyOrderId" TYPE BIGINT USING CASE 
  WHEN "shopifyOrderId" IS NULL THEN NULL 
  ELSE "shopifyOrderId"::BIGINT 
END;

-- AlterTable: Change shopifyRefundId in refund_transactions table from String to BigInt
ALTER TABLE "refund_transactions" 
ALTER COLUMN "shopifyRefundId" TYPE BIGINT USING CASE 
  WHEN "shopifyRefundId" IS NULL THEN NULL 
  ELSE "shopifyRefundId"::BIGINT 
END;

-- AlterTable: Change shopifyOrderId in refund_transactions table from String to BigInt
ALTER TABLE "refund_transactions" 
ALTER COLUMN "shopifyOrderId" TYPE BIGINT USING CASE 
  WHEN "shopifyOrderId" IS NULL THEN NULL 
  ELSE "shopifyOrderId"::BIGINT 
END;

-- AlterTable: Change shopifyCancellationId in shopify_cancellations table from String to BigInt
ALTER TABLE "shopify_cancellations" 
ALTER COLUMN "shopifyCancellationId" TYPE BIGINT USING "shopifyCancellationId"::BIGINT;

-- AlterTable: Change shopifyOrderId in shopify_cancellations table from String to BigInt
ALTER TABLE "shopify_cancellations" 
ALTER COLUMN "shopifyOrderId" TYPE BIGINT USING "shopifyOrderId"::BIGINT;

-- AlterTable: Change shopifyReturnId in shopify_returns table from String to BigInt
ALTER TABLE "shopify_returns" 
ALTER COLUMN "shopifyReturnId" TYPE BIGINT USING "shopifyReturnId"::BIGINT;

-- AlterTable: Change shopifyOrderId in shopify_returns table from String to BigInt
ALTER TABLE "shopify_returns" 
ALTER COLUMN "shopifyOrderId" TYPE BIGINT USING "shopifyOrderId"::BIGINT;

-- Recreate foreign key constraints
ALTER TABLE "shopify_cancellations" ADD CONSTRAINT "shopify_cancellations_shopifyOrderId_fkey" FOREIGN KEY ("shopifyOrderId") REFERENCES "orders"("shopifyOrderId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopify_returns" ADD CONSTRAINT "shopify_returns_shopifyOrderId_fkey" FOREIGN KEY ("shopifyOrderId") REFERENCES "orders"("shopifyOrderId") ON DELETE CASCADE ON UPDATE CASCADE;
