# Prompt 3 — Customer Token Display

> Prepend `00-design-system.md`. Modeled on order-status boards at McDonald's / Chick-fil-A drive-thru screens.

---

Build the **customer-facing token display** for OvenFresh CDS: a passive full-screen board on a wall TV that students watch while waiting. No interaction at all — pure display, readable from 5+ meters.

## Layout

Strictly uses the global light theme (#F8F6F3 background). Split into two vertical zones with a strong divider:

### "NOW SERVING" (left, ~60%)
- Section title in green with a bell icon.
- Grid of large token cards for **ready** orders: token number at 72–96px bold on a green-tinted card with a green border. Newest ready token gets a 3-second entrance emphasis (scale-in + brighter border), then settles — no permanent pulsing/blinking (screen-fatigue anti-pattern).
- Show at most 8; older ready tokens rotate out first.
- Empty state: "Waiting for the kitchen…" in muted text.

### "PREPARING" (right, ~40%)
- Two stacked lists:
  - **Preparing** — amber: token number (40px) + a subtle indeterminate progress shimmer.
  - **In queue** — blue/muted: token numbers (32px) in arrival order.
- Each list capped at 10 with a "+N more" tail.

## Footer ticker (48px)

A slim bottom bar cycling every 8s between: current date/time · "Pay by cash or mobile banking" · today's special (static string from config). Crossfade, no scrolling marquee.

## Behavior

- Data streams from the shared store; a token moves zones the moment the kitchen bumps it — target under 1s perceived latency.
- When a token becomes ready, flash the whole left zone's border green once (attention without sound; optionally a single chime, muted by default).
- Abandoned/served tokens disappear immediately.
- Everything is `aria-live="polite"`; numbers use tabular figures so cards don't jitter as timers change.
- Layout must not shift when lists grow/shrink — reserve fixed zones, overflow via the "+N more" rule.

## Data contract

```ts
interface DisplayToken { token: string; state: 'queued' | 'preparing' | 'ready'; readySince?: number; }
```

Read-only screen: consumes `selectKitchenQueue(state)`; dispatches nothing.
