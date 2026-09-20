/**
 * The "Ships ..." line for a product.
 *
 * `shipDate` is free text set per product in the back office ("July 2026",
 * "Made to order", ...). A month-year that has already passed is stale, so it
 * falls back to the standing estimate from the Delivery page instead of telling
 * shoppers their piece is overdue. Anything that isn't a plain month-year
 * (custom wording, a future month) is shown as written.
 */
export const DEFAULT_SHIP_ESTIMATE = 'Ships in 3\u20135 business days'

export function shipLine(shipDate: string | null | undefined, now: Date = new Date()): string {
  const text = shipDate?.trim()
  if (!text) return DEFAULT_SHIP_ESTIMATE

  const monthYear = /^([A-Za-z]+)\s+(\d{4})$/.exec(text)
  if (monthYear) {
    const first = new Date(`${monthYear[1]} 1, ${monthYear[2]}`)
    if (!Number.isNaN(first.getTime())) {
      // Stale once that month is over.
      const endOfMonth = new Date(first.getFullYear(), first.getMonth() + 1, 1)
      if (endOfMonth <= now) return DEFAULT_SHIP_ESTIMATE
    }
  }
  return `Ships: ${text}`
}
