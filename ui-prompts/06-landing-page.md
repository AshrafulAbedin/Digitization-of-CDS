# Prompt 6 — Landing Page

> Prepend `00-design-system.md`.

---

Build the **Landing Page** for OvenFresh CDS. This is the first screen users see when they visit the application. It acts as an entry point to the different modules of the system.

## Design direction

Follow the same **very minimal and lightweight** design direction established in `00-design-system.md`. Use only the light mode theme. The landing page should feel clean, fast, and highly professional.

## Layout

**Header (72px):** 
Left: "OvenFresh CDS" logo/title (Inter, 24px, Bold, #1A1A1A). Right: A simple "Login" button (ghost or secondary style, #3A3A3A). Background: #FFFFFF with a subtle 1px bottom border.

**Hero Section (Center of screen):**
- **Headline:** "Streamlined Cafeteria Operations" (Inter, 48px, Bold, #1A1A1A).
- **Subheadline:** "Fast point-of-sale, real-time kitchen tracking, and smart inventory management for IUT CDS." (Inter, 16px, Regular, #3A3A3A).
- **Primary Action:** A prominent "Open POS Terminal" button (Uppercase, #1A1A1A background, Inter bold).

**Module Navigation Grid (Below Hero):**
A grid of 4 clean cards (#FFFFFF background, 8px radius, 1px border) representing the core modules.
Each card contains:
1. **Cashier POS:** "Process orders quickly."
2. **Kitchen Display:** "Track and manage active batches."
3. **Inventory:** "Monitor stock and purchases."
4. **Owner Analytics:** "View sales and waste reports."

Hovering over a card should provide a very subtle background tint shift (no heavy shadows or animations).

## Tech constraints & Behavior
- The entire page background should be `#F8F6F3` (Off-White/Warm Paper).
- Buttons and cards should follow the exact typography and color scale defined in the design system.
- Clicking on a module card or the primary button navigates to the respective screen within the app shell.
- Fully responsive, stacking the grid on smaller screens.
