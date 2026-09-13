# Plan

1. **Inventory.tsx**
   - add `dailyStock` polling: `apiGet('/inventory/daily-stock')`
   - move `initDay` and `endOfDay` logic to `ReadyMadeStockTab`? Or pass it down. "End of Day" is for Tab 2 Section B.
   - add `purchasePrefill` state to `Inventory`: `{ item_type: 'raw_material'|'ready_made', item_id: number } | null`.
   - pass `onRestock={(type, id) => { setPurchasePrefill({item_type: type, item_id: id}); setTab('purchases'); }}` to tabs.
   - pass `purchasePrefill` to `PurchaseOrdersTab`.

2. **RawMaterialsTab.tsx**
   - Add `[Restock]` button in Actions column, which calls `onRestock('raw_material', m.raw_material_id)`.
   - Ensure sorting: "LOW-status rows first, then alphabetical." Wait, `materialStatus` gives 'critical', 'warn', 'ok'. The brief says: "Sort order: LOW-status rows first, then alphabetical." I'll update the `sortValue` or useMemo to sort.

3. **ReadyMadeStockTab.tsx**
   - Accept `dailyStock` and `onRestock`.
   - Section A: non-expiry items. Filter `stock` where `!expires_daily`.
     - Columns: Name, Selling price, Current stock, Avg cost, Margin (green if +, red if -), Status badge, Actions ([Purchase], [Edit Price]).
   - Section B: daily-expiry items. Filter `dailyStock`.
     - Columns: Name, Received, Sold, Remaining (Received - Sold), Avg cost, Actions ([Purchase]).
     - Top of section B: [End of Day] and [Purchase (blank)] buttons.

4. **PurchaseOrdersTab.tsx**
   - Transform `builderOpen` into a `<Modal>` (import from `../../components/ui/Modal`).
   - If `prefill` prop changes and is not null, open the modal, set `lineType` and `lineItem` to the prefill values, and add them to `lines`? Wait, the brief says: "pre-filled with: item_type, item_id, (Quantity and unit_cost left blank for user to fill)". Since lines have `quantity` and `unit_cost`, maybe just add a line with empty/0 quantity and cost, or just prefill the inputs. Prefilling the inputs (`lineType`, `lineItem`) is easier.
   - Change `catch(e) { setSubmitError(...) }` to `toast(e.message, 'error')`.

5. **LossesDemandTab.tsx**
   - Has "Missed Demand" and "Waste Log". Wait, the brief says Tab 4 has two sections.
   - Record Stockout modal etc. Let's look at `LossesDemandTab.tsx` later.

6. **Analytics Dashboard**
   - OwnerDashboard.tsx and charts.tsx. We will do this after inventory.

