# Prompt 5 — Owner Analytics Dashboard

> Prepend `00-design-system.md`. Modeled on Square Dashboard "Reports" and Toast "Sales Summary".

---

Build the **Owner Dashboard** for OvenFresh CDS — the one-click report screen from the project proposal. Audience: a non-technical shop owner who checks it once a day. Optimize for glanceability, not exploration.

## Layout

Header (56px): "Dashboard" title + a date-range segmented control: **Today · 7 days · 30 days** (single global filter — every card obeys it). Right: "Export report" ghost button (prints/PDFs the page).

Content: a 12-column grid of cards.

## Row 1 — KPI strip (4 stat tiles)

`StatTile`s: **Net sales ৳** (sub: order count) · **Est. profit ৳** (sub: "after ingredient + waste cost"; green if positive, red if negative) · **Average order ৳** (sub: abandoned count) · **Waste cost ৳** (red, sub: incident count). Each tile shows a small vs-previous-period delta chip (▲/▼ + %, green/red by direction of *goodness*, so waste going down is green).

## Row 2 — Trends (two half-width cards)

1. **Sales over time:** bar chart, one bar per day (or per hour when range = Today). Single series, brand orange, y-axis gridlines minimal, direct value labels on hover tooltip + max-day label always visible. No dual axes, no rainbow.
2. **Top sellers:** horizontal bar list, top 5 by portions sold, each row: rank, item name, portions, revenue ৳, bar scaled to max. Toggle: by portions / by revenue.

## Row 3 — Mix (two half-width cards)

1. **Payment mix:** single stacked horizontal bar (Cash vs Mobile) with a legend and counts+percentages as text. Two colorblind-safe hues, 2px gap between segments.
2. **Dine-in vs takeaway:** same stacked-bar pattern.

## Row 4 — Operations (two half-width cards)

1. **Missed demand:** ranked list from stockout logs — "what we could have sold": item, request count, an amber bar. Sub-caption: "Restock candidates." Empty state explains where the data comes from.
2. **Vendor purchasing:** table of vendor · POs · total spend ৳ in period, plus a one-line total.

## Chart rules (non-negotiable)

- Single-hue for magnitude, two fixed hues max for categorical splits; never assign colors by rank.
- Every chart has a text alternative: hover tooltips plus visible direct labels or an adjacent value table.
- Values in tabular figures; axes and gridlines recessive (muted 1px).
- No pie charts, no dual-axis charts, no 3D, no animation beyond 150ms ease on filter change.
- Validate the categorical pair for colorblind separation and surface contrast in the light mode theme.

## Behavior

- All figures computed from the shared store's order/purchase/waste history via memoized selectors; switching range recomputes instantly (no spinners for local data).
- Cards with no data in range render an `EmptyState`, never a blank chart frame.

## Data contract

```ts
interface OrderRecord { orderId: string; placedAt: number; status: string; total: number;
  paymentMethod: 'cash' | 'mobile'; dineTakeaway: 'dine_in' | 'takeaway';
  items: { name: string; qty: number; price: number; unitCost?: number }[]; }
```

Plus `PurchaseOrder`, `WasteEntry`, `StockoutEntry` from the inventory prompt. Read-only screen; dispatches nothing.
