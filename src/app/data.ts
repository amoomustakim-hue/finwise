// What the app screens read from the API, and small hooks to load it. The server engine does the
// maths; screens only add up transactions for the charts on Analytics and Activity.
import { useEffect, useState } from 'react'
import { api, type Mode } from '../lib/api'
import type { Tx } from './kit'

export type Status = 'on_track' | 'nearly_used' | 'likely_over' | 'over' | 'no_budget'
export type Line = { category: string; spentKobo: number; avgMonthlyKobo: number; projectedKobo: number; budgetKobo: number | null; status: Status }
export type Recurring = { key: string; name: string; direction: 'debit' | 'credit'; typicalAmountKobo: number; typicalDay: number; status: 'paid' | 'due' | 'late'; dueInDays: number | null }
export type Indicator = { id: string; tone: 'good' | 'warning' | 'critical' | 'neutral'; title: string; evidence: string }
export type Business = {
  revenueKobo: number
  costsKobo: number
  profitKobo: number
  revenueVsLastMonthPct: number | null
  costsVsLastMonthPct: number | null
  ownerDrawnKobo: number
  personalFromBusinessKobo: number
  salesByWeekday: { day: string; avgKobo: number }[]
  caveat: string
  unconfirmedCredits: { count: number; kobo: number }
}
export type DashboardData = {
  period: { month: string; day: number; daysInMonth: number }
  overview: {
    incomeKobo: number
    spendKobo: number
    balance: { totalKobo: number; asOf: string | null; complete: boolean; accountsWithBalance: number; accounts: number }
    uncategorised: { count: number; kobo: number }
    business: Business | null
  }
  forecast: { projectedMonthEndBalanceKobo: number | null; assumptions: string[]; complete: boolean }
  categories: Line[]
  hasBudgets: boolean
  recurring: Recurring[]
  indicators: Indicator[]
}
export type Insight = { id: string; title: string; body: string; evidence: string[]; action: { label: string; to: string }; source: 'template' | 'ai' }

/** GET a path whenever it (or `version`) changes. `data` is null while loading; `error` on failure. */
export function useApi<T>(path: string | null, version = 0) {
  const [state, setState] = useState<{ path: string | null; version: number; data: T | null; error: string }>({ path: null, version: -1, data: null, error: '' })
  useEffect(() => {
    if (!path) return
    let live = true
    api<T>(path)
      .then((data) => live && setState({ path, version, data, error: '' }))
      .catch((e) => live && setState({ path, version, data: null, error: (e as Error).message }))
    return () => {
      live = false
    }
  }, [path, version])
  // Keep showing the last data while a refresh for the same page loads.
  const fresh = state.path === path
  return { data: fresh ? state.data : null, error: fresh ? state.error : '', loading: !fresh || state.version !== version }
}

export const useDashboard = (mode: Mode, version = 0) => useApi<DashboardData>(`/dashboard?mode=${mode}`, version)
export const useInsights = (mode: Mode, version = 0) => useApi<{ insights: Insight[] }>(`/insights?mode=${mode}`, version)
export function useTransactions(mode: Mode, opts: { month?: string; category?: string } = {}, version = 0) {
  const q = new URLSearchParams({ mode })
  if (opts.category) q.set('category', opts.category)
  if (opts.month) q.set('month', opts.month)
  return useApi<{ transactions: Tx[] }>(`/transactions?${q}`, version)
}

/** Counted as spending / income the same way the engine does. */
export const isSpend = (t: Tx) => t.direction === 'debit' && (t.kind === 'expense' || t.kind === null)
export const isIncome = (t: Tx) => t.direction === 'credit' && t.kind === 'income'

/** The YYYY-MM month in Lagos for a date. */
export const lagosMonth = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }).slice(0, 7)
export const lagosDay = (d: Date | string) => Number(new Date(d).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }).slice(8, 10))

/** The last `n` months, newest first, as YYYY-MM. */
export function recentMonths(current: string, n = 6) {
  const [y, m] = current.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
}

export const daysIn = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Short money for chart axes: ₦2.1M, ₦850k, ₦900. */
export function compact(kobo: number) {
  const n = kobo / 100
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`
  return `₦${Math.round(n)}`
}
