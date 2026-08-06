  OvenFresh CDS — Full-Stack Implementation Plan

## Goal

  Build the complete OvenFresh CDS application using PERN stack (PostgreSQL,
  Express, React, Node.js). The core principle: all business logic lives in
  PostgreSQL functions/triggers — the Express backend is a thin REST API layer
  that calls those functions and returns results. The React frontend consumes
  the API.

  │ [!IMPORTANT]
  │ You mentioned MERN, but since the entire project is designed around
  │ PostgreSQL with triggers, cursors, and PL/pgSQL functions (which is a core
  │ DBMS project requirement), the plan uses PERN instead. MongoDB cannot
  │ support triggers, cursors, or PL/pgSQL.

  --------

## Current State Assessment

### ✅ What's Done

   Layer                      │ Status      │ Details
  ────────────────────────────┼─────────────┼───────────────────────────────
   Database DDL               │ ✅ Complete │ All 16 tables in
                              │             │ 01_tables.sql[1]
   Triggers                   │ ✅ Complete │ 4 triggers: order status
                              │             │ timestamp, purchase stock
                              │             │ update, batch deduction, sale
                              │             │ stock deduction
   PL/pgSQL Functions         │ ✅ Complete │ 20+ functions across 8 files:
                              │             │ helpers, product views,
                              │             │ customer, orders, kitchen,
                              │             │ abandoned orders, daily
                              │             │ stock, analytics
   Seed Data                  │ ✅ Complete │ seed/01_seed_data.sql[2]
   Frontend — UI Components   │ ✅ Complete │ 7 shared components (Button,
                              │             │ DataTable, Modal, etc.)
   Frontend — Landing Page    │ ✅ Complete │ LandingPage.tsx[3]
   Frontend — Cashier POS     │ ✅ Complete │ Full POS with catalog, order
                              │             │ ticket, customer strip,
                              │             │ escalation, parked orders
   Frontend — Kitchen Display │ ✅ Complete │ Ticket board, escalation
                              │             │ rail, batch management
   Frontend — Token Display   │ ✅ Complete │ Now Serving / Preparing zones
   Frontend — Store           │ ✅ Complete │ AppStore.tsx[4] with mock
                              │             │ data
   Frontend — Types           │ ✅ Complete │ types/index.ts[5]

  [1]: 01_tables.sql file:///Volumes/Sieam's%20SSD/DBMS/Digitization-of-CDS/d…
  [2]: seed/01_seed_data.sql file:///Volumes/Sieam's%20SSD/DBMS/Digitization-…
  [3]: LandingPage.tsx file:///Volumes/Sieam's%20SSD/DBMS/ovenfresh-cds/src/c…
  [4]: AppStore.tsx file:///Volumes/Sieam's%20SSD/DBMS/ovenfresh-cds/src/stor…
  [5]: types/index.ts file:///Volumes/Sieam's%20SSD/DBMS/ovenfresh-cds/src/ty…

### ❌ What's Missing

   Layer       │ What                                         │ Priority
  ─────────────┼──────────────────────────────────────────────┼─────────────
   Backend     │ Entire Express server — 0 files exist        │ 🔴 Critical
   Frontend    │ Inventory & Purchasing page                  │ 🟡 Medium
   Frontend    │ Owner Analytics Dashboard                    │ 🟡 Medium
   Integration │ Replace mock data in AppStore with real API  │ 🔴 Critical
               │ calls                                        │

  --------

## Architecture Overview

    graph TB
        subgraph "Frontend — React 19 + Vite"
            LP["Landing Page"]
            POS["Cashier POS"]
            KDS["Kitchen Display"]
            TD["Token Display"]
            INV["Inventory Page"]
            OA["Owner Analytics"]
            STORE["AppStore (Context + Reducer)"]
            API_CLIENT["api.ts (fetch wrapper)"]
        end

        subgraph "Backend — Express.js (Thin Layer)"
            ROUTER["Express Router"]
            subgraph "Route Modules"
                R1["products.routes.ts"]
                R2["customers.routes.ts"]
                R3["orders.routes.ts"]
                R4["kitchen.routes.ts"]
                R5["inventory.routes.ts"]
                R6["analytics.routes.ts"]
            end
            POOL["pg Pool (connection)"]
        end

        subgraph "Database — PostgreSQL"
            TABLES["16 Tables"]
            TRIGGERS["4 Triggers"]
            FUNCTIONS["20+ PL/pgSQL Functions"]
        end

        LP & POS & KDS & TD & INV & OA --> STORE
        STORE --> API_CLIENT
        API_CLIENT -->|"HTTP REST"| ROUTER
        ROUTER --> R1 & R2 & R3 & R4 & R5 & R6
        R1 & R2 & R3 & R4 & R5 & R6 --> POOL
        POOL -->|"SELECT function()"| FUNCTIONS
        FUNCTIONS --> TRIGGERS
        TRIGGERS --> TABLES

  │ [!IMPORTANT]
  │ Key principle: Express routes do NOT contain business logic. Each route
  │ handler simply calls a PL/pgSQL function (e.g.,  SELECT * FROM
  │ create_order(...) ) and returns the result as JSON. All validation,
  │ calculations, and state transitions happen inside PostgreSQL.

  --------

## Proposed Changes

### Phase 1: Backend — Express Server Setup

  │ The backend lives at  ovenfresh-cds/backend/ . It is a minimal Express +
  │ TypeScript server.

#### [NEW]  backend/package.json

  Dependencies:

    {
      "dependencies": {
        "express": "^5.1.0",
        "pg": "^8.16.0",
        "cors": "^2.8.5",
        "dotenv": "^16.5.0"
      },
      "devDependencies": {
        "typescript": "~5.8.3",
        "@types/express": "^5.0.0",
        "@types/pg": "^8.11.0",
        "@types/cors": "^2.8.17",
        "tsx": "^4.20.0"
      }
    }

#### [NEW]  backend/tsconfig.json

  Standard Node + TypeScript config targeting ES2022.

#### [NEW]  backend/.env

    DATABASE_URL=postgresql://user:password@localhost:5432/cds_database
    PORT=3001

#### [NEW]  backend/src/db.ts  — Database Connection Pool

  A single  pg.Pool  instance exported for all routes. This is the only place
  that connects to PostgreSQL.

    import { Pool } from 'pg';
    import dotenv from 'dotenv';
    dotenv.config();

    export const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

#### [NEW]  backend/src/server.ts  — Express Entry Point

    import express from 'express';
    import cors from 'cors';
    import { productRoutes } from './routes/products.routes';
    import { customerRoutes } from './routes/customers.routes';
    import { orderRoutes } from './routes/orders.routes';
    import { kitchenRoutes } from './routes/kitchen.routes';
    import { inventoryRoutes } from './routes/inventory.routes';
    import { analyticsRoutes } from './routes/analytics.routes';

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use('/api/products', productRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/kitchen', kitchenRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/analytics', analyticsRoutes);

    app.listen(process.env.PORT || 3001);

  --------

### Phase 2: Backend — Route Modules

  Each route module is intentionally thin — it calls a PL/pgSQL function and
  returns the result. No business logic in Express.

#### [NEW]  backend/src/routes/products.routes.ts

   Method │ Endpoi… │ PL/pgSQL Function Called │ Purpose
  ────────┼─────────┼──────────────────────────┼────────────────────────────
    GET   │  /      │  get_cashier_products()  │ Fetch all products for POS
          │         │                          │ catalog
    GET   │  /batch │  get_active_batches()    │ Fetch active batches
          │ es      │                          │

  Example handler pattern (all routes follow this):

    router.get('/', async (req, res) => {
      const result = await pool.query('SELECT * FROM get_cashier_products()');
      res.json(result.rows);
    });

#### [NEW]  backend/src/routes/customers.routes.ts

   Method │ Endpoint            │ PL/pgSQL Function   │ Purpose
  ────────┼─────────────────────┼─────────────────────┼─────────────────────
    GET   │  /search?phone=X    │  find_customer_by_p │ Lookup by phone
          │                     │ hone(phone)         │
    GET   │  /search?idType=X&i │  find_customer_by_i │ Lookup by Student
          │ dNumber=Y           │ d(type, number)     │ ID / NID
    POST  │  /register          │  register_customer( │ Register new
          │                     │ name, phone, id_typ │ customer
          │                     │ e, id_number)       │
    GET   │  /:id/active-       │  get_active_orders( │ Token recovery
          │ orders              │ customer_id)        │

#### [NEW]  backend/src/routes/orders.routes.ts

   Method  │ Endpoint       │ PL/pgSQL Function     │ Purpose
  ─────────┼────────────────┼───────────────────────┼───────────────────────
    POST   │  /             │  create_order(custome │ Place order
           │                │ r_id, payment, dine_t │
           │                │ akeaway, items_json)  │
           │                │                       │
    PATCH  │  /:id/status   │ Direct                │ Advance order status
           │                │  UPDATE customer_orde │
           │                │ r SET status = $1     │
           │                │ (trigger handles      │
    POST   │  /mark-        │  mark_abandoned_order │ Run abandoned order
           │ abandoned      │ s()                   │ cursor

#### [NEW]  backend/src/routes/kitchen.routes.ts

   Method  │ Endpoint     │ PL/pgSQL Function         │ Purpose
  ─────────┼──────────────┼───────────────────────────┼─────────────────────
    GET    │  /orders     │  get_kitchen_orders()     │ Get tickets for KDS
    GET    │  /requests   │  get_pending_requests()   │ Get pending
           │              │                           │ escalations
    POST   │  /batches    │  create_batch(menu_item_i │ Start new batch
           │              │ d, materials_json)        │
    PATCH  │  /batches/:i │  update_batch_status(batc │ Available /
           │ d/status     │ h_id, new_status)         │ Exhausted
    POST   │  /requests   │  create_kitchen_request(o │ Cashier escalation
           │              │ rder_id, item_id, qty)    │
    PATCH  │  /requests/: │  respond_to_kitchen_reque │ Approve / Reject
           │ id           │ st(id, status, approved_q │
           │              │ ty)                       │

#### [NEW]  backend/src/routes/inventory.routes.ts

   Method │ Endpoint            │ PL/pgSQL Function / … │ Purpose
  ────────┼─────────────────────┼───────────────────────┼───────────────────
    GET   │  /raw-materials     │ Direct                │ List raw
          │                     │  SELECT *FROM raw_ma │ materials
    GET   │  /ready-made-stock  │ Direct query joining  │ List ready-made
          │                     │  ready_made_stock  +  │ stock
          │                     │  menu_item            │
    GET   │  /daily-            │ Direct query on       │ Daily stock
          │ stock?date=X        │  ready_made_daily_sto │
          │                     │ ck                    │
    POST  │  /purchase-orders   │ Direct  INSERT  into  │ Receive purchase
          │                     │  purchase_order  +    │
          │                     │  purchase_order_line  │
          │                     │ (triggers handle      │
          │                     │ stock update)         │
    GET   │  /purchase-orders   │ Direct  SELECT  with  │ Purchase history
          │                     │ join                  │
    GET   │  /vendors           │ Direct                │ List vendors
          │                     │  SELECT* FROM vendor │
    POST  │  /vendors           │ Direct                │ Add vendor
          │                     │  INSERT INTO vendor   │
    POST  │  /stockout          │  record_stockout(menu │ Log missed demand
          │                     │_item_id, quantity)   │
    GET   │  /stockout-log      │ Direct  SELECT  on    │ View stockout log
          │                     │  stockout_request     │
    POST  │  /daily-stock/init  │  init_daily_stock(dat │ Initialize daily
          │                     │ e)                    │ stock
    POST  │  /daily-stock/end-  │  end_of_day_waste(dat │ Calculate waste
          │ of-day              │ e)                    │

#### [NEW]  backend/src/routes/analytics.routes.ts

   Method │ Endpoint            │ PL/pgSQL Function    │ Purpose
  ────────┼─────────────────────┼──────────────────────┼────────────────────
    GET   │  /profit?start=X&en │  get_profit_report(s │ Profit report
          │ d=Y                 │ tart, end)           │
    GET   │  /top-              │  get_top_selling_ite │ Top selling items
          │ sellers?limit=N&day │ ms(limit, days)      │
          │ s=D                 │                      │
    GET   │  /top-              │  get_top_requested_i │ Top stockout
          │ requested?limit=N&d │ tems(limit, days)    │ requests
          │ ays=D               │                      │
    GET   │  /waste?start=X&end │  get_waste_report(st │ Waste report
          │ =Y                  │ art, end)            │
    GET   │  /peak-             │  get_peak_hours(days │ Peak hours
          │ hours?days=D        │ )                    │
    GET   │  /vendor-           │  get_vendor_performa │ Vendor performance
          │ performance         │ nce()                │
    GET   │  /preparation-      │  get_preparation_rep │ Preparation report
          │ report?day=X        │ ort(day)             │
    POST  │  /stock-            │  calculate_stock_rec │ Batch
          │ recommendation      │ ommendation(item_id, │ recommendation
          │                     │  weeks)              │

  --------

### Phase 3: Frontend — API Client

#### [NEW]  src/api/client.ts

  A simple  fetch  wrapper that all store actions will use:

    const BASE_URL = 'http://localhost:3001/api';

    export async function apiGet<T>(path: string): Promise<T> {
      const res = await fetch(`${BASE_URL}${path}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }

    export async function apiPost<T>(path: string, body: unknown): Promise<T>
  {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }

    export async function apiPatch<T>(path: string, body: unknown): Promise<T>
  {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }

  --------

### Phase 4: Frontend — Integrate Store with API

#### [MODIFY]  src/store/AppStore.tsx

  Current state: Uses hardcoded mock data, dispatch actions modify local state
  only.

  Change: Replace mock data with API calls. Each dispatch action that mutates
  data will:

  1. Call the API endpoint
  2. On success, re-fetch the relevant data to update local state
  3. On error, show a toast

  Key changes:

  • Remove all mock/seed data arrays
  • Add  useEffect  hooks to fetch initial data on mount (products, batches,
  orders)
  • Wrap dispatch actions to call API first, then update state

    - // Hardcoded mock products
    - const initialProducts: Product[] = [...]
    + // Fetched from API on mount
    + useEffect(() => {
    +   apiGet('/products').then(data => dispatch({ type: 'SET_PRODUCTS',
  payload: data }));
    +   apiGet('/products/batches').then(data => dispatch({ type:
  'SET_BATCHES', payload: data }));
    + }, []);

  --------

### Phase 5: Frontend — Build Missing Pages

#### [NEW]  src/components/Inventory/  — Inventory & Purchasing Page

  Build according to  04-inventory.md
  file:///Volumes/Sieam's%20SSD/DBMS/Digitization-of-CDS/ui-prompts/04-
  inventory.md:

   Component               │ Purpose
  ─────────────────────────┼────────────────────────────────────────────────
    Inventory.tsx          │ Main page with 4-tab layout
    RawMaterialsTab.tsx    │ DataTable of raw materials with status badges
    ReadyMadeStockTab.tsx  │ DataTable of ready-made stock with waste
                           │ recording
    PurchaseOrdersTab.tsx  │ New purchase builder + history table
    LossesDemandTab.tsx    │ Stockout log + waste log side-by-side

#### [NEW]  src/components/Analytics/  — Owner Analytics Dashboard

  Build according to  05-owner-analytics.md
  file:///Volumes/Sieam's%20SSD/DBMS/Digitization-of-CDS/ui-prompts/05-owner-
  analytics.md:

   Component            │ Purpose
  ──────────────────────┼───────────────────────────────────────────────────
    OwnerDashboard.tsx  │ Main page with date range filter
    KPIStrip.tsx        │ 4 StatTiles (Net sales, Profit, Avg order, Waste)
    SalesChart.tsx      │ Bar chart for sales over time
    TopSellers.tsx      │ Horizontal bar list
    PaymentMix.tsx      │ Stacked bar for cash vs mobile
    MissedDemand.tsx    │ Ranked stockout list
    VendorSpend.tsx     │ Vendor purchasing table

  │ [!NOTE]
  │ For charts, we will use a lightweight library. Recharts (~45KB gzipped) is
  │ the most common React charting library and works well with the existing
  │ tech stack.

#### [MODIFY]  src/App.tsx  — Add Missing Routes

    + import { Inventory } from './components/Inventory/Inventory';
    + import { OwnerDashboard } from './components/Analytics/OwnerDashboard';

      <Route path="/pos" element={<CashierPOS />} />
      <Route path="/kitchen" element={<KitchenDisplay />} />
      <Route path="/tokens" element={<TokenDisplay />} />
    + <Route path="/inventory" element={<Inventory />} />
    + <Route path="/analytics" element={<OwnerDashboard />} />

  --------

### Phase 6: Periodic Tasks

#### Abandoned Order Cleanup

  The  mark_abandoned_orders()  cursor function already exists in the
  database. We need to call it periodically:

  Option A (recommended for DBMS project): A simple  setInterval  on the
  backend:

    // In server.ts — runs every 15 minutes
    setInterval(async () => {
      await pool.query('SELECT mark_abandoned_orders()');
    }, 15 * 60 * 1000);

  Option B: Use  pg_cron  extension inside PostgreSQL (requires superuser
  setup).

#### Daily Stock Initialization

  Call  init_daily_stock()  once at startup or via a manual button on the
  Inventory page.

  --------

## File Structure Summary

    ovenfresh-cds/
    ├── backend/
    │   ├── .env
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── db.ts                    # pg Pool
    │       ├── server.ts                # Express entry
    │       └── routes/
    │           ├── products.routes.ts
    │           ├── customers.routes.ts
    │           ├── orders.routes.ts
    │           ├── kitchen.routes.ts
    │           ├── inventory.routes.ts
    │           └── analytics.routes.ts
    ├── database/                        # Already exists (copy from
  Digitization-of-CDS)
    │   ├── run_all.sql
    │   ├── ddl/01_tables.sql
    │   ├── triggers/01-04_*.sql
    │   ├── functions/01-08_*.sql
    │   └── seed/01_seed_data.sql
    ├── src/
    │   ├── api/
    │   │   └── client.ts                # NEW: fetch wrapper
    │   ├── components/
    │   │   ├── CashierPOS/              # ✅ Exists
    │   │   ├── KitchenDisplay/          # ✅ Exists
    │   │   ├── LandingPage/             # ✅ Exists
    │   │   ├── TokenDisplay/            # ✅ Exists
    │   │   ├── Inventory/               # NEW
    │   │   │   ├── Inventory.tsx
    │   │   │   ├── RawMaterialsTab.tsx
    │   │   │   ├── ReadyMadeStockTab.tsx
    │   │   │   ├── PurchaseOrdersTab.tsx
    │   │   │   └── LossesDemandTab.tsx
    │   │   ├── Analytics/               # NEW
    │   │   │   ├── OwnerDashboard.tsx
    │   │   │   ├── KPIStrip.tsx
    │   │   │   ├── SalesChart.tsx
    │   │   │   ├── TopSellers.tsx
    │   │   │   ├── PaymentMix.tsx
    │   │   │   ├── MissedDemand.tsx
    │   │   │   └── VendorSpend.tsx
    │   │   └── ui/                      # ✅ Exists
    │   ├── store/
    │   │   └── AppStore.tsx             # MODIFY: Replace mock data with API
  calls
    │   ├── types/
    │   │   └── index.ts                 # ✅ Exists
    │   └── App.tsx                      # MODIFY: Add /inventory and
  /analytics routes
    └── package.json                     # MODIFY: Add recharts dependency

  --------

## Execution Order

   Step  │ Phase    │ What                                     │ Est. Files
  ───────┼──────────┼──────────────────────────────────────────┼────────────
   1     │ Phase 1  │ Backend scaffolding:  package.json ,     │ 5
         │          │  tsconfig ,  db.ts ,  server.ts ,  .env  │
   2     │ Phase 2  │ Route modules: products, customers,      │ 6
         │          │ orders, kitchen, inventory, analytics    │
   3     │ Phase 3  │ Frontend API client:  api/client.ts      │ 1
   4     │ Phase 4  │ Rewire  AppStore.tsx  to use real API    │ 1
         │          │ calls                                    │
   5     │ Phase 5a │ Build Inventory page (4 tab components + │ 5
         │          │ main)                                    │
   6     │ Phase 5b │ Build Owner Analytics Dashboard (6 sub-  │ 7
         │          │ components + main)                       │
   7     │ Phase 5c │ Add routes in  App.tsx , add  recharts   │ 2
         │          │ dependency                               │
   8     │ Phase 6  │ Backend periodic task (abandoned orders  │ 1
         │          │ interval)                                │
   Total │          │                                          │ ~28 files

  --------

## User Review Required

  │ [!IMPORTANT]
  │ PERN vs MERN: This plan uses PostgreSQL (not MongoDB) because all business
  │ logic relies on PL/pgSQL triggers, cursors, and functions. Please confirm
  │ this is acceptable.

  │ [!IMPORTANT]
  │ Charting library: The plan proposes adding Recharts for the Owner
  Analytics
  │ Dashboard. It's the most popular React charting library. Are you okay with
  │ this, or do you prefer a different library (e.g., Chart.js, Nivo)?

  │ [!IMPORTANT]
  │ Database location: The complete database SQL files exist in  Digitization-
  │ of-
  │ CDS/database/  but the frontend project is in  ovenfresh-cds/ . Should we
  │ copy the database files into  ovenfresh-cds/database/  to keep the full
  │ project in one repo, or keep them separate?

## Open Questions

  │ [!WARNING]
  │ Real-time updates: The Kitchen Display and Token Display ideally need real-
  │ time updates (when an order is placed at the POS, the KDS should show it
  │ immediately). The current plan uses polling (fetch every few seconds). Do
  │ you want WebSocket/Socket.io support for real-time push updates, or is
  │ polling acceptable for this DBMS project?

  │ [!NOTE]
  │ Authentication: The current plan has no login/authentication system. The
  │ landing page has a "Login" button but no auth logic. Is this needed, or is
  │ this purely for demonstration purposes?

  --------

## Verification Plan

### Automated Tests

    # 1. Database — run schema and seed
    psql -d cds_database -f database/run_all.sql

    # 2. Backend — start and verify
    cd backend && npm install && npm run dev
    # Test endpoints:
    curl http://localhost:3001/api/products
    curl http://localhost:3001/api/kitchen/orders

    # 3. Frontend — build check
    cd .. && npm run build

### Manual Verification

  1. Cashier POS flow: Add items → place order → verify order appears in
  kitchen display
  2. Kitchen flow: Advance order status → verify token display updates
  3. Inventory flow: Create purchase order → verify stock updates
  automatically (trigger)
  4. Analytics: Verify profit report, top sellers, waste report return correct
  data
  5. Abandoned orders: Place an order, wait 45+ minutes (or manually test),
  verify it gets marked abandoned
