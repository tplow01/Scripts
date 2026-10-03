/**
 * Money formatting shared by the storefront, the back office and the emails.
 *
 * Client-safe on purpose (no `server-only`): the cart, product cards and the
 * admin order drawer all render prices in the browser.
 */

/** `$44.00`, `$44.50`, `$0.00` — never "$44.5.00". */
export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Flat pricing: shipping is part of the item price, so a zero shipping line
 * is "Included", not "Free". "Free" reads as a promotion that could be
 * withdrawn; "Included" says the price is the price.
 */
export function shippingLabel(amount: number): string {
  return amount === 0 ? 'Included' : formatMoney(amount)
}
