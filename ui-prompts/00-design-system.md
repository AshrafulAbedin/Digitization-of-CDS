# Prompt 0 — Design System & Global Rules (use with every screen prompt)

> Paste this prompt first (or prepend it to any screen prompt). It defines the shared design language for the whole CDS system.

---

You are building the UI for **OvenFresh CDS** — a point-of-sale and operations system for a busy university cafeteria. 

## Design direction

Follow a **very minimal and lightweight** design direction. It should look professional and modern. 
- **Utility-first.** Cashiers use this heavily. Zero visual noise.
- **Light Mode Only.** The system strictly uses a light mode theme to maintain a clean, professional look.

## Color Palette

- **Primary (UI/Buttons):** `#1A1A1A` (Almost Black) - for primary CTAs (Add to cart, Pay Now).
- **Secondary (Accents):** `#C8A87C` (Warm Gold/Beige) - for highlights, active tabs, and confirmations.
- **Background (Main):** `#F8F6F3` (Off-White/Warm Paper) - reduces glare compared to pure white.
- **Background (Cards/Modals):** `#FFFFFF` (Pure White) - for contrast against the main background.
- **Success (Kitchen):** `#2E7D32` (Deep Muted Green) - for "Order Ready" or "Complete".
- **Warning (Admin):** `#B76E6E` (Muted Dusty Rose) - for "Low Stock" or "Held Order".
- **Text:** `#3A3A3A` for body.
- **Labels/Placeholders:** `#8A8A8A`.

## Typography

Use **Inter** (Google Fonts) for primary UI (Headers, Buttons, Labels, Customer View).
Use **JetBrains Mono** (Google Fonts) for Kitchen Order Numbers, Admin Item SKUs, and Timers.

**Font Scale & Rules (strictly max 5 sizes):**
- **Page Title / Total Price:** 24px (1.5rem), 700 (Bold), `#1A1A1A`. 
- **Section Headers:** 18px (1.125rem), 600 (Semi-bold), `#1A1A1A`. 
- **Body Text (Default):** 16px (1rem), 400 (Regular), `#3A3A3A`. 
- **Labels / Metadata:** 14px (0.875rem), 400 (Regular), `#8A8A8A`. 
- **Kitchen Urgent Alerts:** 48px (3rem), 700 (Bold), `#1A1A1A`. 

**Additional Rules:**
- **Buttons:** Use `text-transform: uppercase` and `letter-spacing: 0.5px` **ONLY** on Primary CTA buttons (Add to Cart, Pay Now). Never use uppercase for body text.
- **Kitchen Display:** Minimum font size of 18px. Every single item name must be `#3A3A3A` on a `#F8F6F3` background for maximum contrast.
- **Admin Data Tables:** Use 14px for table cells, but increase the `line-height` to 1.8.

## Tech constraints

- React 19 + TypeScript + Tailwind CSS v4 (using the arbitrary values for custom colors, e.g., `bg-[#F8F6F3]`).
- Named exports, functional components, hooks only.
- All state comes from an existing shared store hook `useAppStore()` returning `{ state, dispatch }`.
- Desktop-first (1366×768 minimum). Every screen is a full-height flex column: fixed header bar, scrollable content region. 

## Shared components to reuse across screens

Define these once and reuse: `Button`, `StatusBadge`, `StatTile`, `DataTable`, `Modal`, `EmptyState`, `SearchInput`.
