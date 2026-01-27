text
# Shopify Returns API - Quick Reference Card

## Your Problem & Solution (60 seconds)

### ❌ What You Were Doing
```typescript
// This returns 404 Not Found
GET /admin/api/2026-01/refunds.json?limit=50
✅ What You Should Do Instead
typescript
// Use GraphQL
query GetReturns($first: Int!) {
  returns(first: $first) {
    edges {
      node {
        id
        name
        status
        order { id name }
        returnLineItems { ... }
      }
    }
  }
}
The Three Methods (Ranked)
🏆 1. Webhooks (Use This)
Real-time, automatic, best

typescript
// Register in shopify.app.ts
webhooks: {
  RETURNS_CREATE: "/webhooks/returns-create",
  RETURNS_UPDATE: "/webhooks/returns-update",
  RETURNS_CANCEL: "/webhooks/returns-cancel",
}

// Save incoming data
async function handleReturnsCreate(request) {
  const payload = await request.json();
  await db.returns.create({ data: payload });
  return json({ success: true });
}

// Query your database
const open = await db.returns.findMany({
  where: { status: "OPEN" }
});
Cost: Free
Latency: <100ms
API Calls: 0

🥈 2. GraphQL Query (Use as Fallback)
Manual, reliable, one API call

typescript
// Single query
const returns = await client.graphql(`
  query {
    returns(first: 100) {
      edges { node { ... } }
      pageInfo { hasNextPage, endCursor }
    }
  }
`);

// Save once per hour
cron.schedule('0 * * * *', async () => {
  // Fetch and upsert
});
Cost: ~$0.02/day
Latency: 1-24 hours
API Calls: 1 per sync

🥉 3. REST API Loop (DON'T USE)
Broken, slow, expensive

typescript
// ❌ BAD - Causes rate limits
for (order of orders) {
  const refunds = await client.rest.get({
    path: `orders/${order.id}/refunds.json`
  });
}
// Uses N API calls!
Cost: Expensive
Latency: Slow
API Calls: 1+N (wasteful)

Copy-Paste Setup
Step 1: Enable Webhooks
text
# shopify.app.toml
scopes = "read_returns,write_returns"
Step 2: Configure App
typescript
// shopify.app.ts
const shopify = shopifyApp({
  // ... existing config
  webhooks: {
    RETURNS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/returns-create",
    },
  },
});
Step 3: Create Route
typescript
// routes/webhooks/returns-create.ts
export async function action(request: Request) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  
  const { topic, shop, session } = await authenticate.webhook(request);
  const payload = await request.json();
  
  // Save to database
  await db.returns.create({
    data: {
      shopifyId: payload.id,
      name: payload.name,
      status: payload.status,
      // ... more fields
    },
  });
  
  return json({ success: true });
}
Step 4: Use Service
typescript
import ShopifyReturnsService from "~/services/shopify-returns.server";

const client = new shopify.clients.Graphql({ session });
const service = new ShopifyReturnsService(client, shop);

// Get all returns
const all = await service.getAllReturns({ limit: 100 });

// Get by status
const open = await service.getReturnsByStatus("OPEN");

// Get by ID
const one = await service.getReturnById("gid://shopify/Return/123");

// Get metrics
const metrics = await service.getReturnMetrics();
GraphQL Query Cheat Sheet
Get All Returns
graphql
query {
  returns(first: 50) {
    edges {
      node {
        id
        name
        status
        createdAt
        order { id name }
        returnLineItems(first: 100) {
          edges {
            node {
              id
              quantity
              returnReason
            }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
Get Return by ID
graphql
query {
  return(id: "gid://shopify/Return/123") {
    id
    name
    status
    order { id }
  }
}
Get Returns by Status
graphql
query {
  returns(first: 50, status: OPEN) {
    edges { node { id name } }
  }
}
Paginate Results
typescript
let cursor = null;
while (true) {
  const result = await client.graphql(`
    query($first: Int!, $after: String) {
      returns(first: $first, after: $after) {
        edges { node { ... } }
        pageInfo { 
          hasNextPage
          endCursor 
        }
      }
    }
  `, { first: 50, after: cursor });
  
  cursor = result.pageInfo.endCursor;
  if (!result.pageInfo.hasNextPage) break;
}
Common Tasks
Task: Get OPEN Returns
typescript
const openReturns = await db.returns.findMany({
  where: { status: "OPEN" }
});
Task: Count Returns by Status
typescript
const metrics = await db.returns.groupBy({
  by: ["status"],
  _count: true
});
Task: Get Returns for Order
typescript
const returns = await db.returns.findMany({
  where: { shopifyOrderId: orderId }
});
Task: Get Recent Returns
typescript
const recent = await db.returns.findMany({
  where: {
    createdAt: { 
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  },
  orderBy: { createdAt: "desc" }
});
Task: Sync All Returns
typescript
async function syncAllReturns() {
  let cursor = null;
  let total = 0;

  while (true) {
    const result = await service.getAllReturns({
      limit: 100,
      after: cursor
    });

    for (const ret of result.returns) {
      await db.returns.upsert({
        where: { shopifyId: ret.id },
        create: ret,
        update: ret,
      });
    }

    total += result.returns.length;

    if (!result.pageInfo.hasNextPage) break;
    cursor = result.pageInfo.endCursor;
  }

  return total;
}
Task: Get Open Returns with Line Items
typescript
const openWithItems = await db.returns.findMany({
  where: { status: "OPEN" },
  include: { 
    lineItems: true,
    order: {
      include: { customer: true }
    }
  },
  orderBy: { createdAt: "desc" }
});
Task: Update Return Status
typescript
const updated = await db.returns.update({
  where: { shopifyId: returnId },
  data: { status: "COMPLETED" }
});
Task: Delete Old Returns (Archive)
typescript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const archived = await db.returns.deleteMany({
  where: {
    status: "COMPLETED",
    closedAt: { lte: thirtyDaysAgo }
  }
});

console.log(`Archived ${archived.count} returns`);
Error Handling
typescript
try {
  const returns = await service.getAllReturns();
} catch (error) {
  if (error.message.includes("401")) {
    // Unauthorized - invalid token
    console.error("Invalid access token");
  } else if (error.message.includes("403")) {
    // Forbidden - missing scope
    console.error("Missing read_returns or write_returns scope");
  } else if (error.message.includes("429")) {
    // Rate limited - wait and retry
    console.error("Rate limited, waiting 60s");
    await sleep(60000);
  } else {
    // Other error
    console.error("Unexpected error:", error);
  }
}
Database Schema (Prisma)
text
model Return {
  id              String   @id @default(cuid())
  shopifyId       String   @unique
  shopifyOrderId  String
  name            String
  status          String   // OPEN, IN_PROGRESS, COMPLETED, CANCELED
  
  createdAt       DateTime
  closedAt        DateTime?
  
  lineItems       ReturnLineItem[]
  refunds         ReturnRefund[]
  
  @@index([shopifyOrderId])
  @@index([status])
  @@index([createdAt])
}

model ReturnLineItem {
  id              String   @id @default(cuid())
  shopifyId       String   @unique
  returnId        String
  return          Return   @relation(fields: [returnId], references: [id], onDelete: Cascade)
  
  quantity        Int
  returnReason    String
  returnReasonNote String?
  
  @@index([returnId])
}

model ReturnRefund {
  id              String   @id @default(cuid())
  shopifyId       String   @unique
  returnId        String
  return          Return   @relation(fields: [returnId], references: [id], onDelete: Cascade)
  
  status          String
  amount          String
  currencyCode    String
  createdAt       DateTime
  
  @@index([returnId])
}
Monitoring Checklist
 Webhook delivery logs visible in Shopify Admin

 No 429 Too Many Requests errors

 Database has returns data

 Return counts match Shopify Admin

 Real-time updates working

 Fallback sync running hourly

 No missing returns in database

 Performance is <100ms for queries

Troubleshooting
Problem	Solution
404 Not Found	Use GraphQL instead of /refunds.json
401 Unauthorized	Regenerate access token
403 Forbidden	Add read_returns scope
429 Rate Limited	Use rate limiting queue
No webhook events	Check webhook registration in Admin
Stale data	Implement fallback sync
Duplicates	Use upsert on shopifyId
Slow queries	Add database indexes
Memory leak	Clear cache periodically
Network timeout	Add retry logic with exponential backoff
API Endpoints Reference
GraphQL Endpoint
text
POST https://{shop}.myshopify.com/admin/api/2026-01/graphql.json
Webhook Topics
text
returns/create    # New return created
returns/update    # Return updated
returns/cancel    # Return canceled
Return Statuses
text
OPEN          # Awaiting processing
IN_PROGRESS   # Item shipped back
COMPLETED     # Processed and closed
CANCELED      # Withdrawn or denied
Performance Tips
1. Use Caching
typescript
// Cache returns for 5 minutes
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}
2. Batch Operations
typescript
// Don't do this (slow)
for (const ret of returns) {
  await db.returns.create({ data: ret });
}

// Do this instead (fast)
await db.returns.createMany({
  data: returns,
  skipDuplicates: true
});
3. Pagination
typescript
// Don't fetch all at once
const all = await service.getAllReturns({ limit: 10000 });

// Do paginate
let cursor = null;
do {
  const result = await service.getAllReturns({ limit: 100, after: cursor });
  // Process result
  cursor = result.pageInfo.endCursor;
} while (result.pageInfo.hasNextPage);
4. Indexes
text
// Add indexes for common queries
model Return {
  // ...
  @@index([status])
  @@index([createdAt])
  @@index([shopifyOrderId])
}
Dependencies
bash
npm install p-retry p-queue
What They Do:
p-retry - Automatic retry with exponential backoff

p-queue - Rate limiting queue

File Locations
text
src/
├── services/
│   ├── shopify-returns.server.ts    # Main service
│   └── webhook-handlers.server.ts   # Webhook handlers
├── routes/
│   └── webhooks/
│       ├── returns-create.ts
│       ├── returns-update.ts
│       └── returns-cancel.ts
└── db.server.ts                     # Prisma client
Environment Variables
text
# shopify.app.ts
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
Testing
Test Service Locally
typescript
// Create test route
export const loader = async ({ request }) => {
  const client = new shopify.clients.Graphql({ session });
  const service = new ShopifyReturnsService(client, shop);

  const returns = await service.getAllReturns({ limit: 10 });
  
  return json({
    totalCount: returns.totalCount,
    returns: returns.returns.slice(0, 3)
  });
};
Test Webhook Locally
bash
# Using ngrok
ngrok http 3000

# Configure webhook callback
# https://xxx.ngrok.io/webhooks/returns-create

# Or use Shopify CLI
shopify app function trigger --local
Key Takeaways
✅ Use GraphQL, not REST API
✅ Webhooks are primary (real-time)
✅ GraphQL query is fallback (1x/hour)
✅ Save to database for fast access
✅ Never call API on every request

Service Methods Quick Ref
typescript
service.getAllReturns({ limit, after, status })
service.getReturnById(id)
service.getReturnsByStatus(status)
service.getOrderReturns(orderId)
service.getReturnMetrics()
service.syncReturnsIncremental(lastSyncAt)
service.processWebhook(topic, payload)
service.clearCache()
service.getCacheStats()
Webhook Methods Quick Ref
typescript
handleReturnsCreate(request)
handleReturnsUpdate(request)
handleReturnsCancel(request)

// Helpers
sendReturnNotification(params)
sendCustomerNotification(params)
createReturnProcessingTask(returnId)
updateInventoryForReturn(returnId)
restoreInventoryForReturn(returnId)
updateReturnTracking(returnId)
logEvent(params)
Status Workflow
text
OPEN 
  ↓
IN_PROGRESS (shipped back)
  ↓
COMPLETED (processed)
  OR
CANCELED (denied/withdrawn)
Cost Comparison
Approach	Setup	Monthly	Annual
Webhooks	$0	$0	$0
GraphQL (hourly)	$0	$0.60	$7.20
GraphQL (daily)	$0	$0.01	$0.12
REST Loop	$0	$30+	$360+
Next Steps
Copy shopify-returns-service.ts

Copy webhook-handlers.ts

Update shopify.app.ts

Create webhook routes

Create database schema

Test webhook delivery

Monitor and iterate

Estimated time: 2-3 hours