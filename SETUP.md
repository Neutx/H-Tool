# H-Tool Setup Guide

## Overview

H-Tool is a comprehensive merchant operations platform for Shopify order cancellation management, refund processing, and inventory control.

## Tech Stack

- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma 5.22
- **Auth:** Firebase Auth (OAuth)
- **Server State:** TanStack Query
- **UI State:** Zustand
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Testing:** Vitest + Playwright
- **Deployment:** Vercel

## Prerequisites

1. Node.js 20.14+ (note: some dependencies prefer 20.19+)
2. npm or yarn
3. Supabase account
4. Firebase account
5. Shopify store with API access

## Environment Variables

Create a `.env` file in the root directory (use `.env.example` as template):

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/htool?schema=public"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# Shopify API
SHOPIFY_STORE_URL="your-store.myshopify.com"
SHOPIFY_ACCESS_TOKEN="your-access-token"
SHOPIFY_API_VERSION="2024-01"

# Other integrations (optional for now)
SAGEPILOT_API_KEY="your-key"
UNICOMMERCE_API_KEY="your-key"
DELHIVERY_API_KEY="your-key"
BLUEDART_API_KEY="your-key"
```

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new Supabase project
   - Copy the connection string to `DATABASE_URL` in `.env`
   - Copy the anon key and URL to `.env`

3. **Set up Firebase:**
   - Create a Firebase project
   - Enable Authentication with OAuth providers
   - Copy the config values to `.env`

4. **Initialize the database:**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed with sample data
   npm run db:seed
   ```

## Development

```bash
# Start development server
npm run dev

# Open Prisma Studio (database GUI)
npm run db:studio

# Run tests
npm run test

# Run E2E tests
npm run test:e2e
```

The app will be available at `http://localhost:3000`

## Project Structure

```
h-tool/
├── app/                      # Next.js App Router
│   ├── (dashboard)/         # Dashboard routes (with shell)
│   │   ├── dashboard/       # Main dashboard
│   │   ├── cancellation-rules/
│   │   ├── refunds/
│   │   ├── inventory/
│   │   ├── analytics/
│   │   └── admin/
│   ├── customer-portal/     # Standalone customer portal
│   ├── layout.tsx           # Root layout
│   ├── page.tsx            # Home (redirects to dashboard)
│   └── globals.css         # Global styles + design tokens
├── components/
│   └── shell/              # App shell (navigation, header)
├── lib/
│   ├── prisma.ts           # Prisma client instance
│   ├── firebase.ts         # Firebase config
│   ├── supabase.ts         # Supabase client
│   ├── types.ts            # Shared TypeScript types
│   └── utils.ts            # Utility functions
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
├── e2e/                    # Playwright tests
├── test/                   # Vitest setup
└── middleware.ts           # Auth middleware
```

## Database Schema

### Core Entities

- **Organization** - Merchant accounts
- **User** - User accounts (Firebase UID)
- **TeamMember** - User-Organization relationship with roles
- **Customer** - Shopify customers
- **Order** - Customer orders
- **LineItem** - Order line items
- **Product** - Product catalog

### Cancellation Management

- **CancellationRequest** - Cancellation requests
- **CancellationRecord** - Permanent audit trail
- **ReviewQueueItem** - Manual review queue
- **Rule** - Automation rules
- **RuleTemplate** - Pre-built templates

### Refund & Inventory

- **RefundTransaction** - Refund processing
- **InventoryAdjustment** - Inventory changes
- **ProductRestockRule** - Per-product restock rules

### Integrations

- **Integration** - External system connections
- **IntegrationSync** - Sync events
- **FailedSync** - Failed sync records
- **OrderStatusUpdate** - Real-time order updates

## Design System

### Colors

- **Primary (Emerald):** Success states, buttons, links
  - `emerald-600` for primary actions
  - `emerald-50` for light backgrounds

- **Secondary (Amber):** Warnings, highlights, tags
  - `amber-600` for warnings
  - `amber-100` for light backgrounds

- **Neutral (Slate):** Text, borders, backgrounds
  - `slate-900` for dark text
  - `slate-100` for light backgrounds

### Typography

- **Headings & Body:** Inter (400, 500, 600, 700)
- **Code/Mono:** JetBrains Mono (400, 500)

## Features

### Milestone 1: Foundation ✅

- [x] Design tokens and styling system
- [x] Database schema with all entities
- [x] Firebase Auth setup
- [x] Supabase configuration
- [x] Application shell with navigation
- [x] Route structure for all sections
- [x] Testing infrastructure (Vitest + Playwright)
- [x] Auth middleware
- [x] Database seeding script

### Milestone 2: Cancellation Rules Engine (Next)

- [ ] Rules dashboard
- [ ] Rule templates library
- [ ] Rule CRUD operations
- [ ] Manual review queue
- [ ] Rule matching engine

### Milestone 3: Refund Management

- [ ] Shopify refund API integration
- [ ] Refund processing flow
- [ ] Retry logic for failures
- [ ] Refund metrics dashboard

### Milestone 4: Inventory Control

- [ ] Restock queue management
- [ ] Unicommerce integration
- [ ] Inventory audit log
- [ ] Manual adjustments

### Milestone 5: Customer Portal

- [ ] Phone OTP authentication
- [ ] Order history
- [ ] Cancellation request flow
- [ ] Real-time status updates (WebSockets)

### Milestone 6: Analytics Dashboard

- [ ] Metrics aggregation
- [ ] Cancellation records table
- [ ] Fraud alerts
- [ ] Report export

### Milestone 7: Admin IAM System

- [ ] User management
- [ ] Role assignment
- [ ] Organization settings

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to DB
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database

# Testing
npm run test             # Run unit tests
npm run test:ui          # Run tests with UI
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # Run E2E tests with UI

# Linting
npm run lint             # Run ESLint
```

## Next Steps

1. **Set up Supabase database** - Create project and configure connection
2. **Configure Firebase Auth** - Enable OAuth providers
3. **Add Shopify credentials** - Set up API access
4. **Run database migrations** - Push schema and seed data
5. **Start development server** - Begin implementing Milestone 2

## Support

For questions or issues, contact the development team.

## License

Proprietary - All rights reserved

