import type { AdminOrder, OrderLineItem } from './types'

/** Build the money fields from lines so seeds can never drift out of sum. */
function money(lineItems: OrderLineItem[], shipping = 0) {
  const subtotal = lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
  return { lineItems, subtotal, shipping, total: subtotal + shipping }
}

/** Seed orders — same IDs/customers/dates/statuses as v1, now with full detail. */
export const MOCK_ORDERS: AdminOrder[] = [
  {
    id: 'SCR-1051', date: '2026-07-29', status: 'pending', paymentStatus: 'paid',
    customer: { name: 'Maya Okafor', email: 'maya.okafor@gmail.com', phone: '+44 7700 900341', address: ['22 Rivington Street', 'London, EC2A 3DY, UK'] },
    ...money([{ productName: '"ANXIETY" — White', size: 'M', qty: 1, unitPrice: 44 }]),
    timeline: { placedAt: '2026-07-29T09:14:00Z', shippedAt: null, deliveredAt: null },
  },
  {
    id: 'SCR-1050', date: '2026-07-28', status: 'pending', paymentStatus: 'paid',
    customer: { name: 'Dev Patel', email: 'dev.patel@gmail.com', phone: '+44 7700 900123', address: ['14 Mercer Street', 'London, WC2H 9QP, UK'] },
    ...money([
      { productName: '"RAGE" — Black', size: 'L', qty: 1, unitPrice: 44 },
      { productName: '"LOVE" — White', size: 'M', qty: 1, unitPrice: 44 },
    ]),
    timeline: { placedAt: '2026-07-28T18:02:00Z', shippedAt: null, deliveredAt: null },
  },
  {
    id: 'SCR-1049', date: '2026-07-27', status: 'pending', paymentStatus: 'paid',
    customer: { name: 'Jordan Lee', email: 'jordan.lee@outlook.com', phone: '+1 (415) 555-0182', address: ['655 Valencia St', 'San Francisco, CA 94110, USA'] },
    ...money([{ productName: '"CONFUSION" — Army Green', size: 'XL', qty: 2, unitPrice: 44 }]),
    timeline: { placedAt: '2026-07-27T14:47:00Z', shippedAt: null, deliveredAt: null },
  },
  {
    id: 'SCR-1048', date: '2026-07-25', status: 'shipped', paymentStatus: 'paid',
    customer: { name: 'Sofia Reyes', email: 'sofia.reyes@icloud.com', phone: '+1 (213) 555-0147', address: ['1428 Echo Park Ave', 'Los Angeles, CA 90026, USA'] },
    ...money([{ productName: '"LOVE" — White', size: 'S', qty: 1, unitPrice: 44 }], 5),
    timeline: { placedAt: '2026-07-25T11:30:00Z', shippedAt: '2026-07-26T16:05:00Z', deliveredAt: null },
  },
  {
    id: 'SCR-1047', date: '2026-07-24', status: 'shipped', paymentStatus: 'paid',
    customer: { name: 'Theo Nakamura', email: 'theo.nakamura@gmail.com', phone: '+81 90-1234-5678', address: ['2-11-3 Jinnan, Shibuya', 'Tokyo 150-0041, Japan'] },
    ...money([
      { productName: '"ANXIETY" — White', size: 'L', qty: 1, unitPrice: 44 },
      { productName: '"RAGE" — Black', size: 'L', qty: 1, unitPrice: 44 },
    ]),
    timeline: { placedAt: '2026-07-24T08:21:00Z', shippedAt: '2026-07-25T13:40:00Z', deliveredAt: null },
  },
  {
    id: 'SCR-1046', date: '2026-07-22', status: 'shipped', paymentStatus: 'refunded',
    customer: { name: 'Amara Diallo', email: 'amara.diallo@gmail.com', phone: '+33 6 12 34 56 78', address: ['18 Rue de la Roquette', '75011 Paris, France'] },
    ...money([{ productName: '"RAGE" — White', size: 'M', qty: 1, unitPrice: 44 }]),
    timeline: { placedAt: '2026-07-22T19:55:00Z', shippedAt: '2026-07-23T10:12:00Z', deliveredAt: null },
  },
  {
    id: 'SCR-1045', date: '2026-07-21', status: 'delivered', paymentStatus: 'paid',
    customer: { name: 'Lucas Meyer', email: 'lucas.meyer@web.de', phone: '+49 151 23456789', address: ['Weserstraße 21', '12045 Berlin, Germany'] },
    ...money([
      { productName: '"CONFUSION" — Army Green', size: 'M', qty: 1, unitPrice: 44 },
      { productName: '"LOVE" — White', size: 'M', qty: 2, unitPrice: 44 },
    ], 5),
    timeline: { placedAt: '2026-07-21T12:09:00Z', shippedAt: '2026-07-22T09:00:00Z', deliveredAt: '2026-07-25T15:22:00Z' },
  },
  {
    id: 'SCR-1044', date: '2026-07-19', status: 'delivered', paymentStatus: 'paid',
    customer: { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', phone: '+91 98765 43210', address: ['Flat 4B, Linking Road, Bandra West', 'Mumbai 400050, India'] },
    ...money([{ productName: '"ANXIETY" — White', size: 'S', qty: 1, unitPrice: 44 }]),
    timeline: { placedAt: '2026-07-19T07:44:00Z', shippedAt: '2026-07-20T11:18:00Z', deliveredAt: '2026-07-23T13:51:00Z' },
  },
  {
    id: 'SCR-1043', date: '2026-07-17', status: 'delivered', paymentStatus: 'paid',
    customer: { name: 'Noah Kim', email: 'noah.kim@naver.com', phone: '+82 10-9876-5432', address: ['24 Itaewon-ro, Yongsan-gu', 'Seoul 04400, South Korea'] },
    ...money([{ productName: '"LOVE" — Black', size: 'L', qty: 1, unitPrice: 44 }]),
    timeline: { placedAt: '2026-07-17T21:36:00Z', shippedAt: '2026-07-18T10:02:00Z', deliveredAt: '2026-07-21T17:45:00Z' },
  },
  {
    id: 'SCR-1042', date: '2026-07-16', status: 'delivered', paymentStatus: 'paid',
    customer: { name: 'Elena Rossi', email: 'elena.rossi@libero.it', phone: '+39 333 123 4567', address: ['Via Paolo Sarpi 8', '20154 Milano, Italy'] },
    ...money([{ productName: '"RAGE" — Black', size: 'M', qty: 2, unitPrice: 44 }]),
    timeline: { placedAt: '2026-07-16T10:28:00Z', shippedAt: '2026-07-17T09:30:00Z', deliveredAt: '2026-07-20T12:10:00Z' },
  },
]
