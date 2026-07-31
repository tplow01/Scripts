'use client'

import { notFound, useParams } from 'next/navigation'
import AovMetric from '@/components/admin/metrics/AovMetric'
import OrdersMetric from '@/components/admin/metrics/OrdersMetric'
import RevenueMetric from '@/components/admin/metrics/RevenueMetric'
import VisitorsMetric from '@/components/admin/metrics/VisitorsMetric'

const METRICS = {
  revenue: RevenueMetric,
  orders: OrdersMetric,
  aov: AovMetric,
  visitors: VisitorsMetric,
} as const

export default function MetricPage() {
  const { metric } = useParams<{ metric: string }>()
  const Component = METRICS[metric as keyof typeof METRICS]
  if (!Component) notFound()
  return <Component />
}
