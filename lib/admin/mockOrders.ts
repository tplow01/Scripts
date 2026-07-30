import type { AdminOrder } from './types'

/** Seed orders — real catalog names, mixed statuses, dated over the two weeks before 2026-07-30. */
export const MOCK_ORDERS: AdminOrder[] = [
  { id: 'SCR-1051', customer: 'Maya Okafor', items: '"ANXIETY" — White ×1', total: 44, date: '2026-07-29', status: 'pending' },
  { id: 'SCR-1050', customer: 'Dev Patel', items: '"RAGE" — Black ×1, "LOVE" — White ×1', total: 88, date: '2026-07-28', status: 'pending' },
  { id: 'SCR-1049', customer: 'Jordan Lee', items: '"CONFUSION" — Green ×2', total: 88, date: '2026-07-27', status: 'pending' },
  { id: 'SCR-1048', customer: 'Sofia Reyes', items: '"LOVE" — White ×1', total: 44, date: '2026-07-25', status: 'shipped' },
  { id: 'SCR-1047', customer: 'Theo Nakamura', items: '"ANXIETY" — Black ×1, "RAGE" — Black ×1', total: 88, date: '2026-07-24', status: 'shipped' },
  { id: 'SCR-1046', customer: 'Amara Diallo', items: '"RAGE" — White ×1', total: 44, date: '2026-07-22', status: 'shipped' },
  { id: 'SCR-1045', customer: 'Lucas Meyer', items: '"CONFUSION" — Green ×1, "LOVE" — White ×2', total: 132, date: '2026-07-21', status: 'delivered' },
  { id: 'SCR-1044', customer: 'Priya Sharma', items: '"ANXIETY" — White ×1', total: 44, date: '2026-07-19', status: 'delivered' },
  { id: 'SCR-1043', customer: 'Noah Kim', items: '"LOVE" — Black ×1', total: 44, date: '2026-07-17', status: 'delivered' },
  { id: 'SCR-1042', customer: 'Elena Rossi', items: '"RAGE" — Black ×2', total: 88, date: '2026-07-16', status: 'delivered' },
]
