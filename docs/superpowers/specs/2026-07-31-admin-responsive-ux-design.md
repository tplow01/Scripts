# Admin Responsive & Drill-Down UX Pass

**Date:** 2026-07-31
**Scope:** UX repair and responsive treatment for Heath's back office (`/office-scr1pts-x7k2`), focused on the metric drill-downs but fixing the same defect class everywhere it appears. Fourth admin iteration; all prior specs merged. Still mock-data, no new dependencies.

## Problems being fixed (observed, not assumed)

Screenshots at 390×844 and 820×1180 on the merged build show:

1. The orders table bleeds outside its card — status pills clipped at the card border on tablet; Total and Status columns entirely off-screen on phone with no scroll affordance.
2. Values wrap mid-token: `SCR-⏎1050`, `2026-07-⏎29`.
3. The "Orders in range" card title sits flush against the card edge (the `!p-0` override removed its padding).
4. Back navigation is a 12px grey breadcrumb at the very top of a long scrolling page — unreachable without scrolling back up.
5. The 224px labelled sidebar engages at `md` (768px), consuming a third of a tablet viewport; on phone a 56px icon rail still eats 14% of width.
6. The headline stat and its delta are crammed onto one line with the title and the range pills, so the delta reads as an afterthought.

## Breakpoint model

Three states replace the current single `md` jump. These are the ONLY breakpoints the admin uses:

| Range | Name | Navigation | Content |
|---|---|---|---|
| `< 640px` (below `sm`) | phone | Fixed bottom nav bar; sidebar hidden | Single column, stacked cards for tabular data |
| `640–1023px` (`sm`–`lg`) | tablet | Icon rail (`w-14`, today's collapsed sidebar) | Tables return, 2-column breakdown grids |
| `≥ 1024px` (`lg`+) | desktop | Full labelled sidebar (`w-56`) | Today's layout plus spacing polish |

`Sidebar.tsx` changes: hidden below `sm`; icon rail `sm` to `lg`; labels appear at `lg` (was `md`). A new `BottomNav.tsx` renders only below `sm` — fixed to the viewport bottom, safe-area aware (`env(safe-area-inset-bottom)`), with the same three destinations plus "Store" (back to `/`), active state matching the sidebar's rules (`pathname === adminPath()` exact for Overview, `startsWith` for the others). The admin layout adds bottom padding below `sm` equal to the bar height so content is never hidden behind it.

## Sticky drill-down header

`MetricShell` replaces its static breadcrumb + title block with a sticky bar (`sticky top-0 z-30`, `bg-ink/95` + `backdrop-blur`, bottom hairline border) containing, left to right:

- **Back control** — a real button/link to `adminPath()` rendered as a bordered ← square on phone, and as "← Overview" with text at `sm`+. Its `aria-label` is always "Back to Overview".
- **Metric name** in Bebas (20px phone, 24px `sm`+), with a 8px uppercase "Overview" eyebrow above it on phone only (replaces the breadcrumb; at `sm`+ the back button's text carries that context).
- **Range pills** right-aligned, unchanged behaviour (7/14/30, `aria-pressed`), sized down on phone (`px-3 py-1.5`, 11px) so all three fit beside the title at 390px.

The 40px page title in the body is removed — the sticky bar is now the page's title, so nothing is duplicated.

## Headline stat block

The headline moves into its own `Card` directly under the sticky bar:

- Uppercase 11px label with range context: `Total revenue · last 14 days` (label text is per-metric; range is interpolated from the selected range).
- The value in Bebas: 44px below `sm`, 56px at `sm`+.
- The delta on its own line as a **chip**: rounded pill, tinted background at 15% of the delta colour, `▲ 12% vs prev period` / `▼ 8% vs prev period` / `— flat`, using the existing green `#5FA36B` / red `#E05252` / grey `#6F6F73`.
- Centred on phone, left-aligned at `sm`+.

The `delta` chip markup lives in one place: a new `DeltaChip.tsx` used by both this block and `StatCard` (StatCard's current inline delta line is replaced by it, so the two never drift).

## Responsive orders list

`OrdersTable.tsx` becomes `OrdersList.tsx` (same props: `orders`, `onOpen`, `sortBy?`), rendering two views from the same sorted array:

- **Below `sm` — stacked cards.** One tappable card per order (a `<button>`, full width, left-aligned text): line 1 = order ID (semibold) + `StatusBadge` right; line 2 = customer name + total (right, `tabular-nums`); line 3 = date + item count, muted 11px. Cards are separated by 8px, not table borders.
- **At `sm`+ — the table**, columns as today (Order / Customer / Date / Total / Status).

Card-clipping fix: the wrapper is `<Card className="!p-0 overflow-hidden">`; the "Orders in range" header is a `div` inside it with `px-5 py-4`; the table sits in its own `overflow-x-auto` container so horizontal scroll happens *inside* the rounded card instead of spilling past it. Empty state ("No orders in this range") renders in both views.

Item count comes from a new pure helper `itemCountLabel(order: AdminOrder): string` in `lib/admin/stats.ts` → `"1 item"` / `"3 items"` (sum of `lineItems[].qty`).

## Charts on small screens

Metric pages pass a responsive height: 140px below `sm`, 200px at `sm`+ (a `useMediaQuery`-free approach: render the chart with `height={compact ? 140 : 200}` where `compact` comes from a tiny `useIsPhone()` hook reading `window.matchMedia('(max-width: 639px)')`, mounted-guarded to avoid hydration mismatch — same pattern as the existing `useShellLayout`). Ticks and hover readouts stay; the readout tooltip's existing edge clamping already keeps it inside narrow cards.

## Other pages

The same defect class is fixed where it already exists — no new features:

- **Orders page** uses `OrdersList`, gaining the phone card view for free. Its inline per-row status `<select>` stays in the table view; in the phone card view the status is display-only (`StatusBadge`) — changing status happens in the drawer, which is one tap away.
- **Products page**: below `sm`, rows become stacked cards (thumbnail + name/emotion/colorway, price + collection, status toggle, edit/delete actions); table at `sm`+. Same card-clipping fix.
- **Overview**: stat grid becomes `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` (currently jumps to 2 columns at phone width, squeezing 36px numbers); breakdown grids become `sm:grid-cols-2 lg:grid-cols-3`; recent-orders rows keep their existing button rows.
- **Metric pages**: breakdown grids `grid-cols-1 sm:grid-cols-2` (revenue/orders/aov) and `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (visitors).
- **Drawers** (`OrderDrawer`, `ProductDrawer`): below `sm` they go full-bleed (`max-w-none`) with the close button at least 44px, so no sliver of overlay remains as a mis-tap target.

## Error handling / edge cases

- Bottom nav must not overlap content: layout adds `pb-[calc(64px+env(safe-area-inset-bottom))]` below `sm` only.
- Sticky bar and open drawers must not fight: the drawer's `z-50` stays above the bar's `z-30`.
- `useIsPhone()` returns `false` during SSR and the first client render, then updates on mount — charts must not read `window` during render.
- Long customer names / product names truncate with ellipsis in both views; no wrap mid-token.
- Empty states preserved in every view (both orders renderings, products, charts).

## Testing

- Vitest: `itemCountLabel` (singular/plural, multi-line orders, zero-qty guard). Layout itself is not unit-testable and gets no fake tests.
- Manual responsive pass at 390 / 820 / 1440 on Overview, all four metric pages, Orders and Products: no horizontal page scroll, nothing clipped at card borders, no mid-token wrapping, sticky bar stays reachable, bottom nav visible only below 640px and never covering content, drawers full-bleed on phone, range pills and back control both tappable at 390px.

## Out of scope

New metrics or data, desktop layout restructuring (spacing/polish only), URL-persisted range state, animations beyond what exists, auth.
