Shopify Returns API - Production-Grade Guide
🔑 Critical Truth About Returns in Shopify
Shopify has NO global /returns.json endpoint in REST API.

Returns are order-scoped resources and ONLY available via GraphQL API for comprehensive fetching.

API Architecture Comparison
Feature	REST API	GraphQL API
Returns Endpoint	❌ No /returns.json	✅ query { returns { ... } }
Query by Order	❌ No direct access	✅ Within Order object
Filtering	❌ Limited	✅ Rich filtering
Real-time webhooks	✅ returns/create	✅ Same webhooks
Scalability	❌ Loop orders manually	✅ Single GraphQL query
Recommended	❌ Legacy (deprecated)	✅ Primary choice
✅ Best Way to Fetch Returns Data
Method 1: GraphQL Query (Recommended) - Single Query, All Returns
This is the production-grade solution for fetching returns efficiently.

typescript
async function fetchReturnsFromShopify(
  client: ShopifyGraphQLClient,
  first: number = 50,
  after?: string
): Promise<{
  returns: Return[];
  pageInfo: PageInfo;
}> {
  const query = `
    query GetReturns($first: Int!, $after: String) {
      returns(first: $first, after: $after) {
        edges {
          node {
            id
            name
            status
            createdAt
            order {
              id
              name
              customer {
                id
                email
              }
            }
            returnLineItems(first: 50) {
              edges {
                node {
                  id
                  quantity
                  returnReason
                  returnReasonNote
                  fulfillmentLineItem {
                    lineItem {
                      id
                      title
                      quantity
                    }
                  }
                }
              }
            }
            refunds(first: 50) {
              edges {
                node {
                  id
                  createdAt
                  status
                  totalRefundedSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  transactions {
                    id
                    kind
                    status
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const response = await client.query({
    data: query,
    variables: {
      first,
      after: after || null,
    },
  });

  if (response.body?.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(response.body.errors)}`);
  }

  return response.body?.data?.returns;
}
Method 2: Webhook-First Architecture (Production)
This is THE way to sync returns in production - webhooks give you real-time data.

typescript
// 1. Register webhook topics in shopify.app.ts
const shopifyApp = shopifyApp({
  webhooks: {
    RETURNS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/returns-create",
    },
    RETURNS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/returns-update",
    },
    RETURNS_CANCEL: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/returns-cancel",
    },
  },
});

// 2. Webhook handler receives complete return data
async function handleReturnCreated(req: Request) {
  const webhook = req.body;

  const returnData = {
    id: webhook.id,
    name: webhook.name,
    status: webhook.status,
    orderId: webhook.order.id,
    createdAt: webhook.created_at,
    returnLineItems: webhook.return_line_items,
    refunds: webhook.refunds,
    // ... all return details
  };

  // Save to database
  await db.returns.upsert({
    where: { shopifyId: returnData.id },
    update: returnData,
    create: returnData,
  });

  return new Response("OK", { status: 200 });
}
Method 3: Incremental Sync (Fallback/Safety Net)
If you miss webhooks or need historical data, sync recent orders and extract returns.

typescript
async function syncReturnsIncremental(
  client: ShopifyGraphQLClient,
  lastSyncAt: Date
): Promise<void> {
  // Step 1: Fetch orders updated since last sync
  const ordersQuery = `
    query GetUpdatedOrders($updatedAfter: DateTime!) {
      orders(first: 50, query: "updated_at:>='$updatedAfter'") {
        edges {
          node {
            id
            name
            returns(first: 50) {
              edges {
                node {
                  id
                  name
                  status
                  createdAt
                  returnLineItems(first: 100) {
                    edges {
                      node {
                        id
                        quantity
                        returnReason
                        fulfillmentLineItem {
                          lineItem {
                            id
                            title
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await client.query({
    data: ordersQuery,
    variables: {
      updatedAfter: lastSyncAt.toISOString(),
    },
  });

  // Step 2: Extract returns from orders
  for (const order of response.body.data.orders.edges) {
    const returns = order.node.returns.edges.map((r) => r.node);

    // Step 3: Sync to database
    for (const ret of returns) {
      await db.returns.upsert({
        where: { shopifyId: ret.id },
        update: {
          status: ret.status,
          updatedAt: new Date(),
        },
        create: ret,
      });
    }
  }

  // Update cursor
  await db.syncCursor.update({
    where: { resource: "returns" },
    data: { lastSyncAt: new Date() },
  });
}
🛠️ Implementation with Shopify API Client
Setup (TypeScript)
typescript
import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { restResources } from "@shopify/shopify-api/rest/admin/2026-01";

// Initialize Shopify app
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  apiVersion: "2026-01",
  isEmbeddedApp: false,
  restResources,
});

// Create GraphQL client
const createGraphQLClient = async (session: Session) => {
  return new shopify.clients.Graphql({ session });
};
Full Service Class
typescript
class ShopifyReturnsService {
  private client: ShopifyGraphQLClient;
  private shop: string;

  constructor(client: ShopifyGraphQLClient, shop: string) {
    this.client = client;
    this.shop = shop;
  }

  /**
   * Fetch ALL returns with pagination support
   */
  async getAllReturns(
    limit: number = 50
  ): Promise<{
    returns: Return[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
  }> {
    const query = `
      query GetAllReturns($first: Int!) {
        returns(first: $first) {
          edges {
            cursor
            node {
              id
              name
              status
              createdAt
              order {
                id
                name
                customer {
                  id
                  email
                  displayName
                }
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
              }
              returnLineItems(first: 100) {
                edges {
                  node {
                    id
                    quantity
                    returnReason
                    returnReasonNote
                    fulfillmentLineItem {
                      lineItem {
                        id
                        title
                        sku
                        quantity
                      }
                    }
                  }
                }
              }
              refunds(first: 100) {
                edges {
                  node {
                    id
                    status
                    createdAt
                    totalRefundedSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await this.client.query({
      data: query,
      variables: { first: limit },
    });

    if (response.body?.errors) {
      throw new Error(
        `Failed to fetch returns: ${JSON.stringify(response.body.errors)}`
      );
    }

    return response.body.data.returns;
  }

  /**
   * Fetch return by ID
   */
  async getReturnById(returnId: string): Promise<Return> {
    const query = `
      query GetReturn($id: ID!) {
        return(id: $id) {
          id
          name
          status
          createdAt
          closedAt
          order {
            id
            name
            customer {
              id
              email
            }
          }
          returnLineItems(first: 100) {
            edges {
              node {
                id
                quantity
                returnReason
                returnReasonNote
              }
            }
          }
          refunds(first: 100) {
            edges {
              node {
                id
                status
                totalRefundedSet {
                  shopMoney {
                    amount
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await this.client.query({
      data: query,
      variables: { id: returnId },
    });

    return response.body.data.return;
  }

  /**
   * Fetch returns with status filter
   */
  async getReturnsByStatus(status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED") {
    const query = `
      query GetReturnsByStatus($status: ReturnStatus!) {
        returns(first: 100, status: $status) {
          edges {
            node {
              id
              name
              status
              createdAt
              order {
                id
                name
              }
            }
          }
        }
      }
    `;

    const response = await this.client.query({
      data: query,
      variables: { status },
    });

    return response.body.data.returns.edges.map((e) => e.node);
  }

  /**
   * Fetch returns for specific order
   */
  async getOrderReturns(orderId: string): Promise<Return[]> {
    const query = `
      query GetOrderReturns($id: ID!) {
        order(id: $id) {
          returns(first: 50) {
            edges {
              node {
                id
                name
                status
                createdAt
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
          }
        }
      }
    `;

    const response = await this.client.query({
      data: query,
      variables: { id: orderId },
    });

    return response.body.data.order.returns.edges.map((e) => e.node);
  }

  /**
   * Get return metrics (count by status)
   */
  async getReturnMetrics() {
    const statuses = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"];
    const metrics = {};

    for (const status of statuses) {
      const query = `
        query CountReturns($status: ReturnStatus!) {
          returns(first: 1, status: $status) {
            totalCount
          }
        }
      `;

      const response = await this.client.query({
        data: query,
        variables: { status },
      });

      metrics[status] = response.body.data.returns.totalCount;
    }

    return metrics;
  }
}
🚀 Usage Examples
typescript
// Initialize
const client = await createGraphQLClient(session);
const returnsService = new ShopifyReturnsService(client, shop);

// 1. Get all returns
const allReturns = await returnsService.getAllReturns(100);
console.log(`Found ${allReturns.returns.length} returns`);

// 2. Get returns by status
const openReturns = await returnsService.getReturnsByStatus("OPEN");
console.log(`Open returns: ${openReturns.length}`);

// 3. Get specific return details
const returnDetail = await returnsService.getReturnById(
  "gid://shopify/Return/945000954"
);
console.log(`Return: ${returnDetail.name}, Status: ${returnDetail.status}`);

// 4. Get order returns
const orderReturns = await returnsService.getOrderReturns(
  "gid://shopify/Order/123456789"
);
console.log(`Order has ${orderReturns.length} returns`);

// 5. Get metrics
const metrics = await returnsService.getReturnMetrics();
console.log("Return counts by status:", metrics);
⚡ Key Points: What Changed From Your Old Approach
❌ Old Way (Inefficient)
typescript
// Fetch ALL orders (slow, rate-limit heavy)
const allOrders = await client.rest.get({ path: "orders.json?limit=250" });

// Loop each order (N+1 problem)
for (const order of allOrders) {
  const refunds = await client.rest.get({
    path: `orders/${order.id}/refunds.json`,
  });
  // Process refunds...
}
Problems:

❌ Fetches unnecessary order data

❌ Makes 1 + N API calls (N = number of orders)

❌ Rate limit: 40 calls/min → can only process ~40 orders

❌ No built-in filtering or pagination for returns

✅ New Way (Optimized)
typescript
// Single GraphQL query gets all returns with order context
const returns = await returnsService.getAllReturns(50);

// Built-in pagination: endCursor
let cursor = null;
do {
  const batch = await returnsService.getAllReturns(50);
  cursor = batch.pageInfo.endCursor;
  // Process batch...
} while (batch.pageInfo.hasNextPage);
Benefits:

✅ Fetches ONLY return data

✅ Single API call regardless of count

✅ Built-in pagination support

✅ Better rate limit usage

✅ Structured filtering (by status, date, etc.)

📊 Return Statuses & Workflow
text
OPEN 
  → IN_PROGRESS (item shipped back)
    → COMPLETED (processed)
    OR CANCELED (withdrawn/denied)
Query by Status:

typescript
// Get all OPEN returns needing attention
const pendingReturns = await returnsService.getReturnsByStatus("OPEN");

// Get completed returns from this week
const completedReturns = await returnsService.getReturnsByStatus("COMPLETED");
🔐 Required Access Scopes
Add to shopify.app.toml:

text
scopes = "write_returns,read_returns"
Or in code:

typescript
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  scopes: ["write_returns", "read_returns"],
  // ...
});
💾 Database Schema for Returns
typescript
// Prisma schema example
model ShopifyReturn {
  id String @id
  shopifyId String @unique
  name String
  status String // OPEN, IN_PROGRESS, COMPLETED, CANCELED
  orderId String
  order ShopifyOrder @relation(fields: [orderId], references: [shopifyId])

  createdAt DateTime
  closedAt DateTime?
  
  lineItems ShopifyReturnLineItem[]
  refunds ShopifyRefund[]
  
  syncedAt DateTime @updatedAt
}

model ShopifyReturnLineItem {
  id String @id
  shopifyId String @unique
  quantity Int
  returnReason String
  returnReasonNote String?
  
  returnId String
  return ShopifyReturn @relation(fields: [returnId], references: [id])
  
  productTitle String
  productSku String?
}

model ShopifyRefund {
  id String @id
  shopifyId String @unique
  status String
  amount Decimal
  currencyCode String
  
  returnId String
  return ShopifyReturn @relation(fields: [returnId], references: [id])
  
  createdAt DateTime
}
🎯 Production Checklist
✅ Use GraphQL API, NOT REST /refunds.json

✅ Implement webhook handlers for returns/create, returns/update, returns/cancel

✅ Use incremental sync as fallback (query updated_at_min for orders)

✅ Implement cursor-based pagination for large datasets

✅ Add error handling and retry logic

✅ Monitor webhook delivery (use Shopify Admin → Apps → Your App → Webhooks)

✅ Add database indexes on shopifyId, status, createdAt

✅ Cache return metrics (expensive to calculate every time)

✅ Add data validation before storing in DB

✅ Log all sync operations for debugging