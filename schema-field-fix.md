# CRITICAL FIX: Wrong GraphQL Schema Fields

## ❌ Your Current Code Has TWO Errors

1. **Using `nodes` instead of `edges { node }`**
2. **Using `amountSet` instead of `amount`**

---

## ✅ EXACT FIXES NEEDED

### FIX 1: Replace the GraphQL Query

**Your code currently has (WRONG):**
```typescript
refunds(first: 50) {
  nodes {                    // ❌ WRONG
    id
    createdAt
    note
    // ...
    transactions(first: 100) {
      edges {
        node {
          id
          amountSet {        // ❌ WRONG - should be 'amount'
            shopMoney {
              amount
              currencyCode
            }
          }
          // ...
        }
      }
    }
  }
}
```

**Change to (CORRECT):**
```typescript
refunds(first: 50) {
  edges {                    // ✅ CORRECT
    node {
      id
      createdAt
      note
      refundLineItems(first: 100) {
        edges {
          node {
            id
            quantity
            restockType
            lineItem {
              id
              name
              sku
            }
          }
        }
      }
      transactions(first: 100) {
        edges {
          node {
            id
            amount {         // ✅ CORRECT - not 'amountSet'
              shopMoney {
                amount
                currencyCode
              }
            }
            status
            gateway
            processedAt
          }
        }
      }
    }
  }
}
```

---

### FIX 2: Update GraphQLOrderNode Interface

**Your code currently has (WRONG):**
```typescript
interface GraphQLOrderNode {
  id: string;
  name: string;
  customer: { ... } | null;
  refunds: {
    nodes: Array<GraphQLRefundNode>;  // ❌ WRONG
  };
}
```

**Change to (CORRECT):**
```typescript
interface GraphQLOrderNode {
  id: string;
  name: string;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  refunds: {
    edges: Array<{             // ✅ CORRECT
      node: GraphQLRefundNode;
    }>;
  };
}
```

---

### FIX 3: Update Transaction Interface

**Your code currently has (WRONG):**
```typescript
transactions: {
  edges: Array<{
    node: {
      id: string;
      amountSet: {           // ❌ WRONG
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };
      // ...
    };
  }>;
};
```

**Change to (CORRECT):**
```typescript
transactions: {
  edges: Array<{
    node: {
      id: string;
      amount: {              // ✅ CORRECT - not 'amountSet'
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };
      status: string;
      gateway: string;
      processedAt: string;
    };
  }>;
};
```

---

### FIX 4: Update Refund Extraction Loop

**Your code currently has (WRONG):**
```typescript
for (const orderEdge of result.data.orders.edges) {
  const order = orderEdge.node;
  for (const refund of order.refunds.nodes) {  // ❌ WRONG
    // ...
  }
}
```

**Change to (CORRECT):**
```typescript
for (const orderEdge of result.data.orders.edges) {
  const order = orderEdge.node;
  for (const refundEdge of order.refunds.edges) {  // ✅ CORRECT
    const refund = refundEdge.node;
    // ...
  }
}
```

---

### FIX 5: Update Transaction Amount Mapping

**Your code currently has (WRONG):**
```typescript
transactions: refund.transactions.edges.map((edge: { node: { 
  id: string; 
  amountSet: { shopMoney: { amount: string } };  // ❌ WRONG
  // ...
} }) => ({
  id: edge.node.id,
  amount: edge.node.amountSet.shopMoney.amount,  // ❌ WRONG
  status: edge.node.status,
  gateway: edge.node.gateway,
  processed_at: edge.node.processedAt,
}))
```

**Change to (CORRECT):**
```typescript
transactions: refund.transactions.edges.map((edge: { node: { 
  id: string; 
  amount: { shopMoney: { amount: string } };     // ✅ CORRECT
  status: string;
  gateway: string;
  processedAt: string;
} }) => ({
  id: edge.node.id,
  amount: edge.node.amount.shopMoney.amount,     // ✅ CORRECT
  status: edge.node.status,
  gateway: edge.node.gateway,
  processed_at: edge.node.processedAt,
}))
```

---

## 📋 Summary of Changes

| Component | Wrong | Correct |
|-----------|-------|---------|
| **Refunds wrapper** | `refunds { nodes { } }` | `refunds(first: 50) { edges { node { } } }` |
| **Transaction amount** | `amountSet { shopMoney { } }` | `amount { shopMoney { } }` |
| **GraphQLOrderNode.refunds** | `{ nodes: Array<...> }` | `{ edges: Array<{ node: ... }> }` |
| **Refund loop** | `for (const refund of order.refunds.nodes)` | `for (const refundEdge of order.refunds.edges) { const refund = refundEdge.node` |
| **Amount access** | `edge.node.amountSet.shopMoney.amount` | `edge.node.amount.shopMoney.amount` |

---

## ✨ Test After Fix

```typescript
const result = await shopify.getRefunds(undefined, 10);
console.log('Success:', result.success);
console.log('Refunds:', result.data?.refunds.edges.length);
// Should work without schema errors
```

Should succeed, not error with schema validation issues.
