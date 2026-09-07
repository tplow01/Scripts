/**
 * The default wording of every order email, and the shape of each one.
 *
 * These are the fallback. Heath edits the live copy in the back office, which
 * is stored in `email_copy`; anything he has not set — or clears — falls back
 * to the line here. So an empty table behaves exactly like the original, and
 * emptying a field restores the original rather than sending a blank email.
 *
 * `label` and `hint` are what the editor shows him, so the form explains
 * itself without him reading this file.
 */

export type EmailTemplateId = 'order_confirmation' | 'order_shipped' | 'order_delivered'

export interface FieldSpec {
  key: string
  label: string
  hint?: string
  /** Renders a textarea rather than a single-line input. */
  multiline?: boolean
  default: string
}

export interface TemplateSpec {
  id: EmailTemplateId
  name: string
  when: string
  fields: FieldSpec[]
}

const NAME_HINT = '{name} becomes the customer’s first name.'
const ORDER_HINT = '{order} becomes the order number, e.g. SCR-1055.'

export const TEMPLATES: TemplateSpec[] = [
  {
    id: 'order_confirmation',
    name: 'Order confirmed',
    when: 'Sent automatically the moment a customer pays.',
    fields: [
      { key: 'subject', label: 'Subject line', hint: ORDER_HINT, default: 'Order confirmed — {order}' },
      { key: 'headline', label: 'Headline', default: 'Order confirmed' },
      { key: 'greeting', label: 'Opening line', hint: NAME_HINT, default: 'Thanks {name} — your order is in.' },
      { key: 'addressLabel', label: 'Address heading', default: 'Shipping to' },
      {
        key: 'closing',
        label: 'Closing line',
        multiline: true,
        default: "We'll email again the moment it ships. Reply to this message if anything looks wrong.",
      },
    ],
  },
  {
    id: 'order_shipped',
    name: 'On its way',
    when: 'Sent when you change an order to Shipped.',
    fields: [
      { key: 'subject', label: 'Subject line', hint: ORDER_HINT, default: 'On its way — {order}' },
      { key: 'headline', label: 'Headline', default: 'On its way' },
      { key: 'greeting', label: 'Opening line', hint: NAME_HINT, default: '{name} — your order has shipped.' },
      { key: 'addressLabel', label: 'Address heading', default: 'Heading to' },
      {
        key: 'closing',
        label: 'Closing line',
        multiline: true,
        default: "Reply to this message if it doesn't turn up.",
      },
    ],
  },
  {
    id: 'order_delivered',
    name: 'Thank you',
    when: 'Sent when you change an order to Delivered. This is the one that wins a second order.',
    fields: [
      { key: 'subject', label: 'Subject line', hint: 'Decides whether it gets opened at all.', default: 'Welcome to the world' },
      { key: 'headline', label: 'Headline', default: 'You made it' },
      { key: 'greeting', label: 'Opening line', hint: NAME_HINT, default: '{name} — it landed. Thanks for wearing SCR!PTS.' },
      {
        key: 'body',
        label: 'Main paragraph',
        multiline: true,
        default:
          'Every piece we make starts as something someone felt and could not say out loud. You are carrying one of those around now, which is the whole point.',
      },
      {
        key: 'hook',
        label: 'The nudge back',
        hint: 'An invitation, not a sales pitch. No discount codes.',
        multiline: true,
        default: 'There is more down there than you have seen. Some of it never makes the shop floor.',
      },
      { key: 'ctaLabel', label: 'Button text', default: 'Back to the world' },
      { key: 'ctaHref', label: 'Button link', default: 'https://scripts.studio' },
      { key: 'signoff', label: 'Sign-off', default: 'Wear it loud.' },
    ],
  },
]

export type Copy = Record<string, string>

export function specFor(id: EmailTemplateId): TemplateSpec {
  const spec = TEMPLATES.find((t) => t.id === id)
  if (!spec) throw new Error(`Unknown email template: ${id}`)
  return spec
}

/** Defaults for one template, as a plain object. */
export function defaultCopy(id: EmailTemplateId): Copy {
  return Object.fromEntries(specFor(id).fields.map((f) => [f.key, f.default]))
}

/**
 * Overrides on top of defaults. Blank or missing values fall back, so clearing
 * a field in the editor restores the original rather than sending nothing.
 */
export function mergeCopy(id: EmailTemplateId, overrides: Copy | null | undefined): Copy {
  const base = defaultCopy(id)
  if (!overrides) return base
  for (const [k, v] of Object.entries(overrides)) {
    if (k in base && typeof v === 'string' && v.trim()) base[k] = v
  }
  return base
}

/** Replace {name} / {order} placeholders. */
export function fill(line: string, vars: Record<string, string>): string {
  return line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
}
