# Prompt 4 — Inventory & Purchasing Back Office

> Prepend `00-design-system.md`. Modeled on back-office modules of Square Dashboard / Lightspeed / MarketMan.

---

Build the **Inventory & Purchasing** back-office screen for OvenFresh CDS, used by the inventory manager off-peak. Denser and more "admin dashboard" than the POS, but same design language.

## Layout

Header (56px): "Inventory" title; right side shows a persistent **reorder alert** summary chip ("3 items below reorder level" — amber, click scrolls/filters to them). Below the header, a horizontal tab bar: **Raw Materials · Ready-Made Stock · Purchase Orders · Losses & Demand**.

## Tab 1 — Raw Materials

`DataTable`: Material · Unit · On hand · Reorder level · Avg unit cost (৳, tabular right-aligned) · Status (`StatusBadge`: OK green / Reorder amber / Critical red when ≤ 50% of reorder level).
- Sortable columns, search-as-you-type filter, and a "Below reorder only" toggle.
- Row click opens a detail drawer: 30-day usage sparkline placeholder, recent purchase history for that material, and a "Add to purchase order" shortcut.

## Tab 2 — Ready-Made Stock

Same table pattern for sellable ready-made items: Item · Selling price · Avg cost · Margin % (computed, color-free) · On hand · Reorder level · Status. Inline "Record waste" row action (small stepper popover: qty + reason select [expired / damaged / other] + confirm) that deducts stock and logs cost.

## Tab 3 — Purchase Orders

Two zones:

1. **"New purchase" builder** (collapsible card, opened by a primary button):
   - Vendor select (with "+ new vendor" inline mini-form: name, phone).
   - Line editor: type toggle (Raw material / Ready-made) → item select → qty → unit cost ৳ → "Add line". Lines list with per-line delete and computed line totals; running grand total bold at the bottom.
   - Primary action: **"Receive purchase"** with helper text "Adds stock and recalculates weighted average cost". On success: toast + table row insert + builder resets.
2. **History table:** PO # · Date · Vendor · Line summary (truncated) · Total ৳. Row expands to full line detail. Filter by vendor and date range.

## Tab 4 — Losses & Demand

Two side-by-side cards:
- **Missed demand (stockout log):** table of item · qty asked · when — fed by cashier "log missed demand" actions. Sub-caption: "What customers wanted but we couldn't sell." Group-by-item toggle showing totals.
- **Waste log:** item · qty · cost impact (৳, red) · date, with period total in the card header.

Both empty states explain who logs the data and why it matters.

## Behavior

- All mutations dispatch to the shared store: `RECEIVE_PURCHASE`, `LOG_WASTE`; reads for stock tables react live (a sale at the POS visibly decrements ready-made stock).
- Money and stock numbers: tabular figures, right-aligned. Units always shown ("48 kg", "22 L").
- Validation inline under fields, submit disabled until valid; never a browser alert.

## Data contract

```ts
interface RawMaterial { id: number; name: string; unit: string; currentStock: number; reorderLevel: number; averageUnitCost: number; }
interface PurchaseLine { itemType: 'raw_material' | 'ready_made'; itemId: number; itemName: string; quantity: number; unitCost: number; }
interface PurchaseOrder { id: number; vendorId: number; vendorName: string; orderDate: number; lines: PurchaseLine[]; totalAmount: number; }
interface StockoutEntry { id: number; itemName: string; quantity: number; requestedAt: number; }
interface WasteEntry { id: number; itemName: string; quantity: number; unitCost: number; recordedAt: number; }
```
