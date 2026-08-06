# CDS UI Prompts

Prompt pack for regenerating the OvenFresh CDS frontend with an industry-standard POS design (Square/Toast/Lightspeed conventions), replacing the current UI.

## How to use

1. Always start with **`00-design-system.md`** — paste it before (or together with) any screen prompt. It carries the shared visual language, tech constraints, and component list.
2. Then use one screen prompt per generation pass:

| File | Screen | Modeled on |
|------|--------|-----------|
| `01-cashier-pos.md` | Cashier POS terminal | Square POS / Toast POS |
| `02-kitchen-display.md` | Kitchen Display System | Toast KDS / Square KDS |
| `03-token-display.md` | Customer token wall board | QSR order-status boards |
| `04-inventory.md` | Inventory & purchasing back office | Square Dashboard / MarketMan |
| `05-owner-analytics.md` | Owner analytics dashboard | Square Reports / Toast Sales Summary |
| `06-landing-page.md` | Landing Page | Clean, minimal entry point |

3. Each prompt ends with a **data contract** — the TypeScript shapes the screen consumes and the store actions it dispatches. These match the existing `useAppStore()` domain (see `src/store/AppStore.tsx`), so generated screens can be wired to the current store with light renaming.

## Locked business rules (do not let a generator "improve" these)

- Guest checkout is the default; registration requires **phone, name, ID Type (Student/NID), and ID Number**. Cashier must verify physical ID.
- Kitchen model: **Prepared in Kitchen** items sell from an active batch (no plate capacity tracking, just availability status); **Ready-Made** items sell from stock.
- Per-order limits on kitchen items escalate to a real kitchen approval (no auto-approval).
- Ready orders untouched for 45 minutes become **abandoned** automatically.
- Purchases update stock and **weighted average cost**; sales/waste deduct stock.
