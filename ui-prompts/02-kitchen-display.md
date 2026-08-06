# Prompt 2 — Kitchen Display System (KDS)

> Prepend `00-design-system.md`. Modeled on industry KDS products (Toast KDS, Square KDS, Fresh KDS).

---

Build the **Kitchen Display System** for OvenFresh CDS: a full-screen board for a landscape monitor mounted in the kitchen, operated by touch or bump-bar-style clicks. Readable from 2 meters.

## Layout

Full-height board with a slim header and a right utility rail (320px).

**Header (56px):** "Kitchen" title, live clock, and three counters: New / Preparing / Ready. If any escalation requests are pending, show a red pulsing pill "2 requests" that scrolls the rail into view.

## Ticket board (main area)

Industry-standard KDS ticket grid — **not** kanban columns with buttons hidden in cards:

- Tickets flow left-to-right, top-to-bottom in arrival order, as fixed-width cards (~260px) in a wrapping grid.
- Each **ticket card**:
  - Header strip colored by state: blue = new, amber = preparing, green = ready. Contains the token number (48px bold, #1A1A1A) and an **elapsed timer** (mm:ss, ticking) that turns amber at 5 min and red at 10 min.
  - Meta line: Dine-in/Takeaway icon + customer name.
  - Item lines: quantity in a box + item name, 18px (minimum), one per line. Only Kitchen items appear on tickets. Item names must be #3A3A3A on a #F8F6F3 background.
  - Footer: one full-width **bump button** that advances state: "Start" → "Ready" → "Served". A long-press (or small ⋯ menu) offers "Recall" (go back one state) and "Cancel".
- New tickets slide in with a brief highlight and an optional chime.
- Ready tickets older than 45 min are auto-flagged **Abandoned** (moved to a collapsed "Abandoned" tray at the bottom, recallable) — this mirrors the database cursor.
- Empty state: "No open tickets" with a relaxed icon.

## Right rail

Two stacked sections:

### 1. Escalation requests (top priority)
Cashier asks to exceed an item's per-order limit. Each request card: item name, "Token #1044 wants **6** (limit 4)", age. Actions: numeric stepper preloaded with the requested qty (min = limit+1, max = requested) + **Approve** (green) and **Reject** (red) buttons. Approving/rejecting removes the card instantly; the POS reacts in real time.

### 2. Batch management
List of today's batches, each row: status dot, "#104 Fried Rice", and a context action: preparing → "Put on sale"; available → "Mark sold out". A "+ New batch" button opens an inline form (item select limited to kitchen items, "Start cooking"). Starting a batch flips the POS card for that item to "Cooking…". No plate/portion tracking is needed.

## Behavior details

- All updates arrive via the shared store — the board re-sorts automatically; never reorder on hover.
- Timers must keep ticking without re-fetch (local interval).
- Touch targets ≥ 48px; the bump button is the full card width and ≥ 52px tall.
- The screen uses the global light-mode theme; no dark mode.

## Data contract

```ts
interface Ticket { token: string; placedAt: number; state: 'new' | 'preparing' | 'ready' | 'abandoned';
  dineIn: boolean; customer: string; lines: { qty: number; name: string }[]; }
interface EscalationRequest { id: number; token: string; itemName: string; requested: number; limit: number; age: number; }
interface Batch { id: number; itemName: string; status: 'preparing' | 'available' | 'exhausted'; }
```

Dispatch: `ADVANCE_ORDER`, `APPROVE_KITCHEN_REQUEST`, `REJECT_KITCHEN_REQUEST`, `START_BATCH`, `MARK_BATCH_AVAILABLE`, `MARK_BATCH_EXHAUSTED`.
