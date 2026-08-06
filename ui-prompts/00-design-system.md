# Prompt 0 — Design System & Global Rules (use with every screen prompt)

> Paste this prompt first (or prepend it to any screen prompt). It defines the shared design language for the whole CDS system.

---

You are building the UI for **OvenFresh CDS** — a point-of-sale and operations system for a busy university cafeteria (IUT Central Departmental Store, Bangladesh). It digitizes paper tokens, batch cooking, inventory, and owner reporting.

## Design direction

Follow the conventions of modern industry POS products (Square POS, Toast, Lightspeed, Clover):

- **Utility-first, not decorative.** Cashiers use this 6 hours a day during rush hour. Zero visual noise, no gradients, no glassmorphism, no hover-to-reveal actions. Every action is a visible button.
- **Density with hierarchy.** Compact rows and grids, but a clear 3-level type hierarchy (page title 18–20px semibold, section labels 12–13px uppercase muted, body 14px).
- **Large touch targets.** Minimum 44×44px for anything tappable; primary action buttons 48–56px tall.
- **Instant feedback.** Every action shows an immediate state change plus a compact toast (bottom-left, 2.5s). Destructive actions get an inline confirm, never a browser alert.
- **Numbers are the product.** Prices, quantities, and token numbers use a tabular-numeric font style, right-aligned in tables, and are the largest elements in their card.

## Visual language

- **Layout:** flat surfaces separated by 1px borders and background tint shifts — not shadows. 8px spacing grid. Cards use 8–10px radius (not 20px+ pills).
- **Color:** neutral gray/warm-white workspace. One brand accent: **orange #EA580C** (buttons, active states, brand marks). Semantic colors reserved strictly for meaning: green = success/ready, amber = in-progress/warning, red = error/out-of-stock, blue = informational/new. Never use semantic colors decoratively.
- **Dark mode:** full support via a class toggle; dark surfaces are neutral gray (#111827 family), not tinted brown.
- **Typography:** Inter or system-ui. No serif, no rounded display fonts.
- **Icons:** a single consistent set (Lucide or Material Symbols), 20px default, always paired with a text label on primary actions.
- **Currency:** format as `৳120` (BDT taka sign), thousands separators, no decimals for whole amounts.

## Tech constraints

- React 19 + TypeScript + Tailwind CSS v4 (utility classes only, no inline styles, no CSS-in-JS).
- Named exports, functional components, hooks only.
- All state comes from an existing shared store hook `useAppStore()` returning `{ state, dispatch }` — assume it exists; define TypeScript interfaces for whatever data the screen consumes.
- Desktop-first (1366×768 minimum), degrade gracefully to tablet landscape. No mobile layouts needed.
- Every screen is a full-height flex column: fixed header bar, scrollable content region. The app shell provides a station-switcher nav; screens must not add their own global nav.

## Shared components to reuse across screens

Define these once and reuse: `Button` (primary / secondary / ghost / danger, sm / md / lg), `StatusBadge` (semantic pill with icon + label), `StatTile` (label, big number, sub-caption), `DataTable` (sticky header, zebra-free, row hover, right-aligned numeric columns), `Modal` (center, max-w 480–640px, ESC + backdrop close, focus trap), `EmptyState` (icon, one-line explanation, optional action), `SearchInput` (leading icon, clear button).

## Accessibility

- WCAG AA contrast in both themes.
- Full keyboard operation of the cashier flow (search, arrows, Enter to add, F-key shortcuts documented on-screen).
- Focus rings always visible; `aria-live="polite"` on toast and queue updates.
