import { z } from 'zod'
import { ANALYTICS_EVENTS } from '@/lib/analyticsEvents'

/** Every name except 'purchase' — see lib/analyticsEvents.ts. */
const CLIENT_EVENTS = ANALYTICS_EVENTS.filter((e) => e !== 'purchase') as Exclude<
  (typeof ANALYTICS_EVENTS)[number],
  'purchase'
>[]

export const trackEventSchema = z.object({
  event: z.enum(CLIENT_EVENTS as [string, ...string[]]),
  sessionId: z.string().min(8).max(64),
  deviceType: z.enum(['mobile', 'desktop']),
  path: z.string().max(256).optional(),
  meta: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean()])).refine(
    (m) => Object.keys(m).length <= 10,
    { message: 'meta may have at most 10 keys' },
  ).optional(),
})

export type TrackEventInput = z.infer<typeof trackEventSchema>
