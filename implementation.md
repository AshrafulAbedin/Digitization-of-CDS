# OvenFresh CDS — Complete Implementation Brief

## Inventory & Analytics: Full Feature Specification

**Branch:** `implementation-LA`
**Prepared by:** Irfan (database layer)
**Audience:** Implementation engineer (backend + UI/UX)
**Status:** Ready to build

---

## PART 0 — SCOPE

This document covers **everything still to be built** for the Inventory and Analytics modules of OvenFresh CDS.

The database schema, triggers, and existing functions are **already complete and committed**. This document covers:

1. Five new database functions (SQL included — run once)
2. Inventory module features
3. Analytics module features
4. Backend endpoints to expose
5. Behaviours, validation rules, and error handling
6. Test plan

**Guidance principle:** This document describes **what each feature should do** — not which library, framework, or pattern to use. Choose the implementation approach that fits the existing codebase.

---

## PART 1 — CONTEXT: WHAT'S ALREADY DONE

The following database changes are **already committed**. No action needed.

### 1.1 Three new CHECK constraints

To prevent silent data corruption, `purchase_order_line.quantity`, `kitchen_batch_issue_line.quantity_taken`, and `order_line.quantity` must all be greater than zero.

### 1.2 Purchase trigger — margin protection added

The purchase-stock-update trigger now **blocks any purchase** that would push the average cost above the item's selling price. This applies to:

- Ready-made **non-expiry** items (Coke, Mineral Water, Chips)
- Ready-made **daily-expiry** items (Shingara, Samosa, Puri)

When blocked, PostgreSQL raises an exception that includes the item name, the attempted cost, the resulting average, and the current selling price.

### 1.3 Sale deduction trigger — stock checks added

The sale deduction trigger now prevents overselling:

- Non-expiry items: rejects sale if stock insufficient
- Daily-expiry items: rejects sale if today's remaining quantity is insufficient

### 1.4 Order creation validation

The order-creation function now rejects orders with invalid menu items, empty carts, or non-positive quantities.

### 1.5 Kitchen queue fix

The kitchen-orders query now includes `ready` status orders so the Kitchen Display's Ready column populates correctly.

### 1.6 Idempotent end-of-day waste

The waste-calculation function can be run multiple times per day. It recalculates only when underlying values change. Safe to trigger from the UI without worry.

---

## PART 2 — THE FIVE NEW DATABASE FUNCTIONS

Paste all five functions into a new file: `database/functions/09_inventory_edits.sql`.

Then add this line to `database/run_all.sql`, **after** `\ir functions/08_analytics.sql`:

```
\ir functions/09_inventory_edits.sql
```

Then run once:

```bash
psql -U postgres -d cds_v2 -f database/run_all.sql
```

---

### Function 1 — `update_menu_item_price`

**Purpose:** Allow the owner to change a ready-made item's selling price. Blocks the change if the new price is below the current average cost.

```sql
DROP FUNCTION IF EXISTS update_menu_item_price(INTEGER, DECIMAL);
CREATE OR REPLACE FUNCTION update_menu_item_price(
    p_menu_item_id INTEGER,
    p_new_price DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_is_prepared BOOLEAN;
    v_expires_daily BOOLEAN;
    v_cost DECIMAL := 0;
    v_item_name TEXT;
BEGIN
    SELECT is_prepared_in_kitchen, expires_daily, name
    INTO v_is_prepared, v_expires_daily, v_item_name
    FROM menu_item
    WHERE menu_item_id = p_menu_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Menu item % does not exist', p_menu_item_id;
    END IF;

    IF p_new_price <= 0 THEN
        RAISE EXCEPTION 'Selling price must be positive';
    END IF;

    IF v_is_prepared = FALSE THEN
        IF v_expires_daily = FALSE THEN
            SELECT COALESCE(average_unit_cost, 0) INTO v_cost
            FROM ready_made_stock WHERE menu_item_id = p_menu_item_id;
        ELSE
            SELECT COALESCE(average_unit_cost, 0) INTO v_cost
            FROM ready_made_daily_stock
            WHERE menu_item_id = p_menu_item_id AND stock_date = CURRENT_DATE;
        END IF;

        IF v_cost > 0 AND p_new_price < v_cost THEN
            RAISE EXCEPTION
                'SELL PRICE BLOCK: new price ৳% is below current average cost ৳% for "%". Lower cost first or set price >= cost.',
                p_new_price, ROUND(v_cost, 2), v_item_name;
        END IF;
    END IF;

    UPDATE menu_item SET selling_price = p_new_price
    WHERE menu_item_id = p_menu_item_id;

    RETURN p_new_price;
END;
$$ LANGUAGE plpgsql;
```

**Behaviour:**

- Prepared meals: any positive price is allowed (no direct cost basis)
- Non-expiry ready-made: price must be ≥ current average cost
- Daily-expiry ready-made: price must be ≥ today's average cost
- On violation, raises an exception with a clear, shopkeeper-readable message

---

### Function 2 — `get_sales_by_day`

**Purpose:** Return daily revenue and order count for a date range.

```sql
DROP FUNCTION IF EXISTS get_sales_by_day(DATE, DATE);
CREATE OR REPLACE FUNCTION get_sales_by_day(p_start DATE, p_end DATE)
RETURNS TABLE(day DATE, orders BIGINT, revenue DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(co.order_timestamp) AS day,
        COUNT(DISTINCT co.order_id) AS orders,
        COALESCE(SUM(ol.quantity * ol.unit_price_snapshot), 0) AS revenue
    FROM customer_order co
    LEFT JOIN order_line ol ON ol.order_id = co.order_id
    WHERE DATE(co.order_timestamp) BETWEEN p_start AND p_end
      AND co.status <> 'abandoned'
    GROUP BY DATE(co.order_timestamp)
    ORDER BY day;
END;
$$ LANGUAGE plpgsql;
```

---

### Function 3 — `get_payment_mix`

**Purpose:** Return order count and revenue split by payment method (cash vs mobile).

```sql
DROP FUNCTION IF EXISTS get_payment_mix(DATE, DATE);
CREATE OR REPLACE FUNCTION get_payment_mix(p_start DATE, p_end DATE)
RETURNS TABLE(payment_method VARCHAR, order_count BIGINT, total DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.payment_method,
        COUNT(co.order_id)::BIGINT,
        COALESCE(SUM(co.total_paid), 0)
    FROM customer_order co
    WHERE DATE(co.order_timestamp) BETWEEN p_start AND p_end
      AND co.status <> 'abandoned'
    GROUP BY co.payment_method;
END;
$$ LANGUAGE plpgsql;
```

---

### Function 4 — `get_service_mix`

**Purpose:** Return order count and revenue split by dine-in vs takeaway.

```sql
DROP FUNCTION IF EXISTS get_service_mix(DATE, DATE);
CREATE OR REPLACE FUNCTION get_service_mix(p_start DATE, p_end DATE)
RETURNS TABLE(service_type VARCHAR, order_count BIGINT, total DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.dine_in_takeaway,
        COUNT(co.order_id)::BIGINT,
        COALESCE(SUM(co.total_paid), 0)
    FROM customer_order co
    WHERE DATE(co.order_timestamp) BETWEEN p_start AND p_end
      AND co.status <> 'abandoned'
    GROUP BY co.dine_in_takeaway;
END;
$$ LANGUAGE plpgsql;
```

---

### Function 5 — `get_waste_cost`

**Purpose:** Return the total cost of waste (unsold daily-expiry items) for a date range.

```sql
DROP FUNCTION IF EXISTS get_waste_cost(DATE, DATE);
CREATE OR REPLACE FUNCTION get_waste_cost(p_start DATE, p_end DATE)
RETURNS DECIMAL AS $$
DECLARE
    v_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(quantity_wasted * average_unit_cost), 0)
    INTO v_total
    FROM ready_made_daily_stock
    WHERE stock_date BETWEEN p_start AND p_end;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;
```

---

### After running the SQL

Verify all five functions exist:

```sql
\df update_menu_item_price
\df get_sales_by_day
\df get_payment_mix
\df get_service_mix
\df get_waste_cost
```

Then commit and push.

---

## PART 3 — INVENTORY MODULE (features to build)

### 3.1 Purpose

The shopkeeper's control panel. Answers: *What do I have? What do I need to buy? What did I throw away? What did customers ask for that I didn't have?*

**User:** Shopkeeper
**Frequency:** 2–3 times per day
**Live update:** Refreshes automatically while open

---

### 3.2 Page structure — four tabs

```
[ Raw Materials ]  [ Ready-Made ]  [ Purchase Orders ]  [ Losses & Demand ]
```

---

### 3.3 Tab 1 — Raw Materials

**What it shows:** Every ingredient the kitchen uses (rice, chicken, oil, coffee beans, flour, etc.)

**What each row displays:**

- Item name
- Unit (kg / litre / piece)
- Current stock quantity
- Reorder level
- Average unit cost (৳)
- Status: a visual "LOW" indicator when current stock is at or below the reorder level, otherwise "OK"
- An action button: **Restock**

**Row order:** Low-stock items appear first, then alphabetical.

**Behaviour — the Restock button:**
Clicking Restock opens the Purchase Order form (see section 3.6) pre-filled with this raw material as the first line item.

**What the user cannot do:**
Stock quantities are never edited directly. Stock changes only as a consequence of purchases, cooking batches, sales, or waste. This is a hard business rule.

---

### 3.4 Tab 2 — Ready-Made Stock

This tab has two vertically stacked sections because the two item types behave differently.

---

#### Section 2a — Non-Expiry Ready-Made

Items like Coke, Mineral Water, Chips that are bought pre-made and don't expire.

**What each row displays:**

- Item name
- Selling price (৳)
- Current stock count
- Average unit cost (৳)
- Margin (selling price minus cost) — visually green if positive, red if negative
- Status: LOW indicator if stock is at or below reorder level
- Two actions: **Purchase** and **Edit Price**

**Behaviour — Purchase button:**
Opens the Purchase Order form pre-filled with this item.

**Behaviour — Edit Price button:**
Opens a small editor with a single field for the new selling price. On submit, sends the change to the backend.

**Expected error case:** If the new price is below the item's current average cost, the change is rejected with a clear message like:

> *"SELL PRICE BLOCK: new price ৳25 is below current average cost ৳28.59 for 'Coke (500ml)'. Lower cost first or set price >= cost."*

Show this message prominently. The price must not change when rejected.

---

#### Section 2b — Daily-Expiry Ready-Made

Items like Shingara, Samosa, Puri that are ordered fresh each morning and thrown out at night.

**Two page-level buttons at the top of this section:**

- **End of Day** — recalculates today's waste for all daily-expiry items
- **Purchase** — opens a blank Purchase Order form

**What each row displays:**

- Item name
- Quantity received today
- Quantity sold today
- Remaining (received minus sold)
- Today's average unit cost (৳)
- One action: **Purchase**

**Behaviour — End of Day button:**
Show a confirmation dialog. On confirm, trigger the waste calculation. Display the result as a toast: *"Today's waste has been recorded."*

This operation can safely be run multiple times — it recalculates if new sales have occurred.

**Behaviour — Purchase button (per row):**
Opens the Purchase Order form pre-filled with this item.

---

### 3.5 Tab 3 — Purchase Orders

**What it shows:** Every purchase the shop has made from vendors — a receipts ledger.

**Page-level button:** **+ New Purchase**

**List view (collapsed rows):**

| Field | Notes |
| ------- | ------- |
| PO number | Sequential ID |
| Date | Purchase date |
| Vendor name | Who supplied |
| Total amount | Sum of line costs (৳) |
| Line count | Number of items in this PO |
| Expand control | Reveals individual lines |

**Expanded view** — each line shows:

- Item type (Raw Material or Ready-Made)
- Item name
- Quantity
- Unit cost
- Line subtotal

**Sort:** Most recent first.

**Behaviour — New Purchase:**
Opens the Purchase Order form (see 3.6).

---

### 3.6 The Purchase Order form

A dialog with the following structure:

**Header fields:**

- Vendor dropdown — shows all vendors. Vendors are optionally tagged with what they supply (raw materials / ready-made expiry / ready-made non-expiry); the list can be filtered to show only relevant vendors if desired.
- Notes (optional, free text)

**Line editor:**
Each line has:

- Item type selector (Raw Material / Ready-Made)
- Item selector — filtered by type
- Quantity input
- Unit cost input
- Line subtotal (auto-calculated)
- Remove-line control

**Bottom controls:**

- Add another line
- Grand total (auto-calculated, updates as lines change)
- Cancel
- Submit

**Behaviour on Submit:**

The entire purchase order is submitted as a single unit. Either every line succeeds and the order is saved, or nothing is saved.

**The critical error case — margin block:**

If any line would push an item's average cost above its selling price, the entire submission fails. No line is saved. No stock changes.

The user sees an explicit message like:

> *"MARGIN BLOCK: purchasing 60 units of 'Coke (500ml)' at ৳75 would raise average cost to ৳41.82, which exceeds the selling price ৳40. Please update the selling price first."*

The message must be shown in full. The dialog stays open so the user can adjust the price (via the Ready-Made tab) and retry.

---

### 3.7 Tab 4 — Losses & Demand

Two stacked sub-sections.

---

#### Sub-section 4a — Missed Demand (Stockout Log)

**What it shows:** Every time a customer wanted something that was unavailable. This is a wishlist of lost sales.

**Page-level button:** **Record Stockout**

**Each row displays:**

- Date
- Item name
- Quantity requested
- Day of week

**Filter control:** Last 7 days / Last 30 days

**Behaviour — Record Stockout button:**
Opens a small dialog: item selector + quantity input + submit. Useful for when the cashier hears about a missed sale later and logs it retroactively.

---

#### Sub-section 4b — Waste Log

**What it shows:** Every day's thrown-away daily-expiry items, with cost impact.

**Page-level button:** **Recalculate Today**

**Each row displays:**

- Date
- Item name
- Quantity received
- Quantity sold
- Quantity wasted
- Cost impact (৳) — computed as wasted quantity × average cost

**Filter control:** Last 7 days / Last 30 days

**Bottom of table:** Total waste cost for the visible range.

**Behaviour — Recalculate Today button:**
Same as End of Day on Tab 2 — triggers waste recalculation. Safe to run repeatedly.

---

### 3.8 Inventory — summary of backend endpoints required

| Method | Endpoint | Purpose |
| -------- | ---------- | --------- |
| GET | `/api/inventory/raw-materials` | All raw materials with stock |
| GET | `/api/inventory/ready-made-stock` | Non-expiry items with stock + cost |
| GET | `/api/inventory/daily-stock` | Today's daily-expiry rows |
| GET | `/api/inventory/vendors` | Vendor list with phone numbers |
| GET | `/api/inventory/purchase-orders?days=30` | Purchase order history |
| GET | `/api/inventory/stockout-log?days=30` | Missed demand log |
| GET | `/api/inventory/waste-log?days=30` | Waste log |
| POST | `/api/inventory/purchase-orders` | Create purchase order |
| POST | `/api/inventory/vendors` | Add a vendor |
| POST | `/api/inventory/stockout` | Record missed demand |
| POST | `/api/inventory/daily-stock/end-of-day` | Recalculate today's waste |
| PATCH | `/api/inventory/menu-items/:id/price` | Edit selling price |

---

## PART 4 — ANALYTICS MODULE (features to build)

### 4.1 Purpose

The owner's business dashboard. Read-only. Answers: *Am I making money? What's selling? What do I need to cook more of? Where am I losing money?*

**User:** Owner only
**Frequency:** End of day, weekly reviews
**Live update:** Refreshes slowly in the background — informational, not real-time

---

### 4.2 Page structure

**Top of page — date range selector:**
Three options: **Today**, **7 days**, **30 days**. Selecting a range updates everything on the page.

**Below selector — two zones:**

1. A row of key-performance cards (top)
2. A grid of charts (below)

---

### 4.3 The date range — behaviour rules

When the range is **Today**:

- Revenue card shows today's total
- Cost card shows today's total
- **Profit card is hidden**
- Average order card shows
- Waste cost card shows

When the range is **7 days** or **30 days**:

- All five cards show, including Profit

**Why Profit is hidden on Today:** Prepared meal cost is captured when a batch is cooked, not when its plates are sold. A single day can look artificially unprofitable (batch cooked, not sold) or artificially profitable (sold from yesterday's stock). At 7 or more days, the timing balances out. Showing profit for a single day would be misleading — hiding it is the honest choice.

---

### 4.4 The KPI row — visual hierarchy rule

**The most important metric gets the biggest visual weight.**

Ranking and card sizing:

| Rank | Metric | Card Size | Number Size |
| ------ | -------- | ----------- | ------------- |
| **1** | **Revenue** | Double width | Largest |
| **2** | Cost | Standard width | Standard |
| **3** | Profit (or Avg Order when Profit hidden) | Standard width | Standard |
| **4** | Avg Order (or Waste Cost) | Standard width | Standard |
| **5** | Waste Cost | Standard width | Smallest |

**Visual hierarchy in practice:**

- Revenue card occupies roughly **double the width** of any other card
- Its number is rendered much larger (roughly 1.5× the size of the others)
- Its label sits above the number in smaller text
- A subtitle below (e.g., "86 orders · +12% vs last week") provides context

**The rationale:** When someone glances at the dashboard, their eye should land on Revenue first. The visual weight **tells** them what matters — it doesn't need to be read.

**When Profit is hidden (Today view):** The grid reflows to four cards. Revenue remains the hero.

---

### 4.5 Chart 1 — Sales Over Time

**What it shows:** Revenue for each day in the selected range, as a vertical bar chart.

**Behaviour:**

- Bars are a single hue (the brand gold)
- Hovering a bar shows the exact revenue and order count for that day
- If no sales exist in range, show a centered placeholder message ("No sales in range")

**What the owner learns:** Which days are strong, which are weak.

---

### 4.6 Chart 2 — Top Sellers

**What it shows:** The best-performing menu items, ranked.

**Two view options:** By portions sold / By revenue.

**Visual hierarchy — critical:**

The rank of each item determines its visual weight:

| Rank | Bar height | Text size | Bar intensity |
| ------ | ----------- | ----------- | --------------- |
| #1 | Largest | Largest, bold | Full intensity |
| #2 | Medium-large | Medium | Slightly dimmed |
| #3 | Medium | Medium | Dimmed |
| #4 | Smaller | Smaller | More dimmed |
| #5–10 | Smallest | Smallest | Most dimmed |

**Why:** The eye immediately lands on #1. The hierarchy is *felt*, not just read. This is what makes a dashboard look intentionally designed rather than like a spreadsheet dump.

**What the owner learns:** The star product. The next two or three to keep in rotation. The long tail that isn't worth much attention.

---

### 4.7 Chart 3 — Payment Mix

**What it shows:** What proportion of revenue came from cash versus mobile payment.

**Visual style:** A single horizontal bar split into two colored segments, with percentage and ৳ amount labelled beneath each segment.

**Accessibility:** The two colors must be distinguishable by people with colour blindness. Avoid red/green pairs.

**What the owner learns:** How much cash is on hand at close of day.

---

### 4.8 Chart 4 — Dine-in vs Takeaway

**What it shows:** What proportion of orders were consumed in-house versus taken away.

**Visual style:** Same as Payment Mix — single bar, two segments, percentages and totals beneath.

**What the owner learns:** Whether table capacity is the bottleneck, or takeaway packaging.

---

### 4.9 Chart 5 — Missed Demand

**What it shows:** The items customers asked for but couldn't buy, ranked by number of requests.

**Subtitle (always visible):** *"Restock candidates — what we could have sold"*

**Visual hierarchy — same principle as Top Sellers:**

| Rank | Size | Emphasis |
|------|------|----------|
| #1 | Largest | Highlighted in an urgency colour (amber/orange) |
| #2–4 | Medium | Standard |
| #5+ | Small | Standard |

**Why #1 gets amber:** It signals urgency. "You lost 18 sales on this item — restock it."

**What the owner learns:** The exact items to prioritize in tomorrow's cooking or purchasing plan.

---

### 4.10 Chart 6 — Vendor Purchasing

**What it shows:** How much has been spent at each vendor over the selected range.

**Visual style:** A ranked table, not a chart. Each row shows vendor name, PO count, total spend. A total is shown at the bottom.

**Optional hierarchy:** The top vendor row can be subtly emphasized (background tint) to signal "where most of your money goes."

**What the owner learns:** Which supplier to negotiate with first.

---

### 4.11 Chart 7 — Peak Hours (optional)

**What it shows:** Order count grouped by hour of day, as a vertical bar chart.

**Behaviour:** The peak hour bar is emphasized (darker shade). Subtitle reads *"Peak: 1pm"*.

**What the owner learns:** When to schedule kitchen staff.

**This chart is optional** — include it if the visual balance of the dashboard benefits from a seventh tile, otherwise leave it out.

---

### 4.12 Analytics — summary of backend endpoints required

| Method | Endpoint | Purpose |
| -------- | ---------- | --------- |
| GET | `/api/analytics/profit?start=&end=` | Revenue, cost, profit totals |
| GET | `/api/analytics/top-sellers?limit=&days=` | Top selling items |
| GET | `/api/analytics/top-requested?limit=&days=` | Top missed items |
| GET | `/api/analytics/waste?start=&end=` | Waste per item |
| GET | `/api/analytics/peak-hours?days=` | Hourly order counts |
| GET | `/api/analytics/vendor-performance` | Vendor spend totals |
| GET | `/api/analytics/preparation-report?day=` | Tomorrow's cooking plan |
| GET | `/api/analytics/sales-by-day?start=&end=` | Daily revenue (NEW) |
| GET | `/api/analytics/payment-mix?start=&end=` | Cash vs mobile (NEW) |
| GET | `/api/analytics/service-mix?start=&end=` | Dine vs takeaway (NEW) |
| GET | `/api/analytics/waste-cost?start=&end=` | KPI helper (NEW) |
| POST | `/api/analytics/stock-recommendation` | Compute tomorrow's plan |

**Recommendation:** Provide a single `GET /api/analytics/summary?range=` endpoint that returns all KPIs and the first few charts in one response. Reduces frontend request count and simplifies loading states.

---

## PART 5 — VALIDATION AND ERROR HANDLING

### 5.1 Error message shape

All error responses from the backend should use a consistent JSON shape:

```json
{ "error": "Human-readable message" }
```

### 5.2 Status codes

- **400** — business-rule violation (margin block, sell-price block, invalid item)
- **404** — resource not found
- **422** — validation failure (missing field, non-positive number)
- **500** — unexpected server error

### 5.3 Trigger messages must reach the user

When a database trigger raises an exception (margin block), the exact exception message must be:

1. Caught in the backend
2. Returned to the frontend with HTTP 400
3. Displayed in full to the user in a visible error surface (toast or dialog)

Never substitute a generic "An error occurred" — the trigger message is the useful part.

### 5.4 Client-side validation (before submit)

- Quantities and prices must be positive numbers
- Purchase orders must have at least one line
- Item pickers must have a selection before submit is enabled

---

## PART 6 — BEHAVIOURS AND INTERACTION RULES

### 6.1 Refreshing

- Inventory refreshes itself periodically (roughly every 10 seconds)
- Analytics refreshes periodically (roughly every 15 seconds)
- After any user-initiated change (purchase, price update, stockout), the affected screen should refetch immediately — don't wait for the next refresh tick

### 6.2 Confirmation dialogs

Use confirmation dialogs for:

- End of Day (waste calculation)
- Deleting a purchase order (if that feature exists)
- Any action that cannot be undone

Do NOT use confirmation dialogs for:

- Adding a line to a purchase order
- Changing a filter or range
- Opening any modal

### 6.3 Feedback

- **Success:** Short green toast, e.g. *"Purchase order saved."*
- **Failure with business rule:** Red error surface, full message from backend
- **Loading:** Subtle inline indicator — never block the whole page

### 6.4 Empty states

Every table and chart must have a designed empty state. Never show a broken chart or an empty grid with no explanation. Use a short message like *"No data in range"* or *"Nothing here yet"*.

### 6.5 Currency format

Always display ৳ as prefix, with thousands separator, no decimals above ৳100.

Examples:

- `৳12,450`
- `৳2,080`
- `৳395`

---

## PART 7 — TEST PLAN

### 7.1 Inventory tests

| # | Action | Expected outcome |
| --- | -------- | ------------------ |
| 1 | Open Raw Materials tab | Table populated; low-stock rows highlighted |
| 2 | Click Restock on Rice, buy 20 kg @ ৳85 | Stock 45→65; avg ৳80→৳81.5; PO appears in history |
| 3 | Try to buy Coke at a price that pushes avg cost above ৳40 | Red error with the margin-block message; nothing saved |
| 4 | Try the same for Shingara (daily-expiry) | Same margin-block error |
| 5 | Edit Coke price to ৳45 | Price updates; margin recalculates |
| 6 | Try to set Coke price below cost | Red error with sell-price-block message |
| 7 | Click End of Day with 15 Shingara unsold | Waste log shows ৳155 entry |
| 8 | Click End of Day again after 3 more sales | Waste recalculates correctly |

### 7.2 Analytics tests

| # | Action | Expected outcome |
| --- | -------- | ------------------ |
| 1 | Open with empty database | Cards show ৳0; charts show placeholders |
| 2 | Create 5 orders (mixed payment and service types) | Cards and charts populate |
| 3 | Switch Today → 7 days → 30 days | Data refetches; Profit card appears only on 7/30 |
| 4 | View Top Sellers chart | Rank-1 bar is visibly largest; hierarchy descends |
| 5 | View Missed Demand chart | Rank-1 item highlighted in amber |
| 6 | View Payment Mix | Stacked bar shows correct percentages |
| 7 | View Vendor Purchasing | Aggregated spend per vendor |
| 8 | Confirm revenue card is visually dominant | It should occupy roughly double the width of other cards |

### 7.3 Margin-block dual verification

Confirm the margin block applies to **both** ready-made item types:

```sql
-- Test A: Non-expiry (Coke at ৳75 vs selling ৳40)
INSERT INTO purchase_order_line (purchase_order_id, item_type, item_id, quantity, unit_cost)
VALUES (1, 'ready_made', 5, 20, 75);
-- Expected: MARGIN BLOCK exception

-- Test B: Daily-expiry (Shingara at ৳20 vs selling ৳15)
INSERT INTO purchase_order_line (purchase_order_id, item_type, item_id, quantity, unit_cost)
VALUES (1, 'ready_made', 8, 100, 20);
-- Expected: MARGIN BLOCK exception
```

Both must raise the exception. If either succeeds, the trigger is incomplete.

---

## PART 8 — OPEN DECISIONS

These need to be answered before or during implementation:

1. **Export report** — Do we add a CSV export button on Analytics? If yes, what columns?
2. **Reorder-level editing** — Do we allow the shopkeeper to change reorder thresholds from the UI, or leave them fixed?
3. **Peak Hours chart** — Include as a 7th chart, or keep the analytics page to 6 tiles?
4. **Stock recommendation UI** — The backend already generates stocking recommendations. Where should the owner see them? A card on Analytics? A tab in Inventory?
5. **Analytics refresh interval** — 15 seconds, or slower?

---

## PART 9 — DELIVERABLES CHECKLIST

### Database layer (Irfan)

- [x] DDL CHECK constraints added
- [x] Purchase trigger rewritten with margin block
- [x] Sale trigger rewritten with stock checks
- [x] Order function rewritten with validation
- [x] Kitchen queue function fixed
- [x] Idempotent waste function
- [ ] Five new functions saved to `database/functions/09_inventory_edits.sql`
- [ ] `run_all.sql` updated with `\ir functions/09_inventory_edits.sql`
- [ ] Setup re-run successfully
- [ ] Committed and pushed to `implementation-LA`

### Backend layer

- [ ] All Inventory endpoints from Part 3.8
- [ ] All Analytics endpoints from Part 4.12
- [ ] Trigger exceptions surfaced with HTTP 400
- [ ] Consistent error shape `{ error: string }`

### Frontend layer

- [ ] All Inventory tabs from Part 3
- [ ] All Analytics KPI cards and charts from Part 4
- [ ] Visual hierarchy applied to rank-1 items (Revenue card; Top Seller #1; Missed Demand #1)
- [ ] All behaviour rules from Part 6
- [ ] Empty states designed

### Quality

- [ ] All tests from Part 7 pass
- [ ] Margin block verified for both ready-made types
- [ ] Profit card correctly hidden on Today view

---

*End of brief.*
