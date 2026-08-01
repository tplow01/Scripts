/** The ONE place the hidden admin slug lives. Change it here, nowhere else. */
export const ADMIN_SLUG = 'office-scr1pts-x7k2'

/** Build an admin route: adminPath() → '/office-scr1pts-x7k2', adminPath('orders') → '…/orders'. */
export function adminPath(sub = ''): string {
  return `/${ADMIN_SLUG}${sub ? `/${sub}` : ''}`
}

/** Stock at or below this reads as low — amber in the admin, "Only N left" on the PDP. */
export const LOW_STOCK_THRESHOLD = 5
