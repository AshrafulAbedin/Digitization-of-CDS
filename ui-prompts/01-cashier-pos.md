# Prompt 1 — Cashier POS Terminal

> Prepend `00-design-system.md`. This is the primary screen; it gets the most polish.

---

Build the **Cashier POS terminal** for OvenFresh CDS. Two-pane layout: product catalog left (~62%), order ticket right (~38%), under a slim status header.

## Header bar (56px)

Left: store name + live clock. Center: three compact metrics — today's order count, kitchen queue depth ("4 preparing"), active batches (popover on click listing each batch with a status dot and portions remaining). Right: parked-orders button with count badge, dark-mode toggle.

## Catalog pane (left)

- Sticky toolbar: search input (autofocus, filters as you type, `/` shortcut) + segmented filter: **All · Kitchen · Ready-Made**.
- Product grid, 4–5 columns of compact cards (~110px tall). Each card: item name (2-line clamp), price bold bottom-left, availability bottom-right, and a colored left edge strip for state (green available, amber preparing, red out).
- Availability display by item kind:
  - **Batch-cooked item** (e.g. Fried Rice): "23 left · Batch #104" — sells from remaining portions of the active batch. Amber "Cooking…" when the batch is preparing; red "Sold out" when exhausted.
  - **Made-to-order item** (e.g. Burger): "Made to order ~12 min".
  - **Ready-made item** (e.g. Shingara): live stock count; when stock ≤ reorder level show an amber "Low" chip.
- Whole card is the click target; click adds 1 to the ticket. Unavailable cards are 50% muted but still clickable — clicking opens a small **"Log missed demand"** popover (stepper + confirm) that records a stockout request.
- Card click gives 100ms pressed feedback; item flies nowhere — no cute animations, the ticket line just appears/increments instantly.

## Order ticket pane (right)

Top to bottom:

1. **Ticket header:** next token number `#1044` (large, tabular), Dine-in/Takeaway segmented control.
2. **Customer strip:** one input — "Phone number (optional)". Empty = Guest (default, zero friction). Typing a valid 11-digit `01XXXXXXXXX` number looks up the customer: found → chip with name + "View active tokens" link; not found → inline "Register" affordance expanding to a single row: name field + save (phone + name only, NO ID/verification of any kind).
3. **Line items list** (scrolls): each row = name, unit price small, qty stepper (− qty +), line total right-aligned, swipe-free explicit ✕ remove. Qty stepper on a kitchen item that passes its per-order limit triggers the **kitchen escalation flow**: inline row state becomes "Ask kitchen for N" with a send button → row shows an amber "Awaiting kitchen…" spinner state; the row unlocks when the kitchen approves (qty set to approved amount, brief green flash) or rejects (reverts to limit, red flash + toast). While any row is pending, checkout is disabled and a **"Park order"** secondary button appears.
4. **Totals block:** subtotal, total (large). Payment segmented control: **Cash · Mobile banking**.
5. **Charge button:** full-width 56px primary — label "Charge ৳270". Disabled states show why ("Cart empty", "Awaiting kitchen…").

## Post-payment modal

On charge: modal with oversized token number, order summary, payment method, and two buttons: "Print token" (primary) and "Done". If the order contains made-to-order items, show "Sent to kitchen — watch the token screen"; if not, "Hand over items now". Closing resets the ticket to a fresh token number and Guest customer.

## Parked orders

Header button opens a right-side drawer listing parked tickets: token, customer, item summary, age, status chip (waiting on kitchen / ready to resume / rejected). "Resume" loads it back into the ticket pane. Parked tickets waiting >5 min surface a reminder banner at the top of the ticket pane.

## Keyboard shortcuts (show a `?` cheat-sheet popover)

`/` focus search · `Enter` add highlighted item · `F2` customer field · `F4` park · `F9` charge · `Esc` close modal.

## Data contract (assume from `useAppStore()`)

```ts
interface Product { id: number; name: string; price: number; kind: 'BATCH' | 'TO_ORDER' | 'READY_MADE';
  remaining?: number; batchId?: number; batchStatus?: 'preparing' | 'available' | 'exhausted';
  stock?: number; reorderLevel?: number; perOrderLimit: number; etaMinutes?: number; }
interface TicketLine { productId: number; qty: number; pending?: boolean; approvedCeiling?: number; }
```

Dispatch actions: `PLACE_ORDER`, `CREATE_KITCHEN_REQUEST`, `LOG_STOCKOUT`, `REGISTER_CUSTOMER`.
