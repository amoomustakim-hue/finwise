// Dashboard for one mode. Displays numbers computed by the server engine; does no maths of its own
// beyond formatting. Status is always shown as icon + text, never colour alone.
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { api, type Mode } from '../lib/api'
import { formatDate, formatNaira } from '../lib/format'

type Status = 'on_track' | 'nearly_used' | 'likely_over' | 'over' | 'no_budget'
type Line = { category: string; spentKobo: number; avgMonthlyKobo: number; projectedKobo: number; budgetKobo: number | null; status: Status }
type Recurring = { key: string; name: string; direction: 'debit' | 'credit'; typicalAmountKobo: number; typicalDay: number; status: 'paid' | 'due' | 'late'; dueInDays: number | null }
type Indicator = { id: string; tone: 'good' | 'warning' | 'critical' | 'neutral'; title: string; evidence: string }
type Business = {
  revenueKobo: number; costsKobo: number; profitKobo: number; revenueVsLastMonthPct: number | null; costsVsLastMonthPct: number | null
  ownerDrawnKobo: number; personalFromBusinessKobo: number; salesByWeekday: { day: string; avgKobo: number }[]; caveat: string
  unconfirmedCredits: { count: number; kobo: number }
}
type DashboardData = {
  period: { month: string; day: number; daysInMonth: number }
  overview: {
    incomeKobo: number; spendKobo: number
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

const TONE: Record<Indicator['tone'], { icon: string; ring: string; text: string }> = {
  good: { icon: '✓', ring: 'ring-emerald-200 bg-emerald-50', text: 'text-emerald-800' },
  warning: { icon: '!', ring: 'ring-amber-200 bg-amber-50', text: 'text-amber-900' },
  critical: { icon: '!', ring: 'ring-red-200 bg-red-50', text: 'text-red-800' },
  neutral: { icon: 'i', ring: 'ring-slate-200 bg-white', text: 'text-slate-800' },
}

// Meter fill carries severity; track is a lighter step of the same hue; label + icon always shown.
const METER: Record<Exclude<Status, 'no_budget'>, { fill: string; track: string; label: string; icon: string }> = {
  on_track: { fill: 'bg-brand', track: 'bg-teal-100', label: 'On track', icon: '✓' },
  likely_over: { fill: 'bg-[#fab219]', track: 'bg-amber-100', label: 'Likely to go over', icon: '!' },
  nearly_used: { fill: 'bg-[#fab219]', track: 'bg-amber-100', label: 'Nearly used', icon: '!' },
  over: { fill: 'bg-[#d03b3b]', track: 'bg-red-100', label: 'Over budget', icon: '✕' },
}

const pctText = (p: number | null, upIsGood: boolean) => {
  if (p === null) return null
  const good = p >= 0 === upIsGood
  return <span className={good ? 'text-emerald-700' : 'text-red-700'}>{p >= 0 ? '▲' : '▼'} {Math.abs(p)}% vs last month (same day)</span>
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs">{sub}</p>}
    </div>
  )
}

export default function Dashboard({ mode, version }: { mode: Mode; version: number }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [showAssumptions, setShowAssumptions] = useState(false)

  useEffect(() => {
    api<DashboardData>(`/dashboard?mode=${mode}`).then(setData).catch((e) => setError(e.message))
  }, [mode, version])

  if (error) return <p className="text-red-700">{error}</p>
  if (!data) return <p className="text-slate-500">Loading your dashboard…</p>
  if (!data.categories.length && !data.overview.incomeKobo && !data.overview.spendKobo) return null

  const o = data.overview
  const b = o.business
  const monthName = new Date(`${data.period.month}-01T12:00:00Z`).toLocaleString('en-GB', { month: 'long' })
  const budgeted = data.categories.filter((l) => l.budgetKobo !== null)
  const due = data.recurring.filter((r) => r.status !== 'paid')
  const maxSpend = Math.max(...data.categories.map((l) => l.spentKobo), 1)

  return (
    <div className="mb-6 flex flex-col gap-4">
      {/* Hero figure: one per view */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        {b ? (
          <>
            <p className="text-sm text-slate-500">Estimated profit · {monthName} so far</p>
            <p className={`mt-1 text-5xl font-semibold ${b.profitKobo < 0 ? 'text-red-700' : ''}`}>{formatNaira(b.profitKobo)}</p>
            <p className="mt-2 text-xs text-slate-500">{b.caveat}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">Available balance</p>
            <p className="mt-1 text-5xl font-semibold">{o.balance.asOf ? formatNaira(o.balance.totalKobo) : '—'}</p>
            <p className="mt-2 text-xs text-slate-500">
              {o.balance.asOf
                ? `From your latest statement balance (${formatDate(o.balance.asOf)})${o.balance.complete ? '' : `; ${o.balance.accounts - o.balance.accountsWithBalance} account(s) don't report a balance`}.`
                : "Your data doesn't include a reliable balance."}
            </p>
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        {b ? (
          <>
            <Tile label="Sales" value={formatNaira(b.revenueKobo)} sub={pctText(b.revenueVsLastMonthPct, true)} />
            <Tile label="Business costs" value={formatNaira(b.costsKobo)} sub={pctText(b.costsVsLastMonthPct, false)} />
            <Tile label="You paid yourself" value={formatNaira(b.ownerDrawnKobo)} sub={<span className="text-slate-500">Not counted as a cost</span>} />
            <Tile label="Cash in the account" value={o.balance.asOf ? formatNaira(o.balance.totalKobo) : '—'} sub={o.balance.asOf ? <span className="text-slate-500">as of {formatDate(o.balance.asOf)}</span> : undefined} />
          </>
        ) : (
          <>
            <Tile label={`Money in · ${monthName}`} value={formatNaira(o.incomeKobo)} />
            <Tile label={`Money out · ${monthName}`} value={formatNaira(o.spendKobo)} />
          </>
        )}
      </div>

      {data.forecast.projectedMonthEndBalanceKobo !== null && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">Estimated balance at month end</p>
          <p className={`mt-1 text-2xl font-semibold ${data.forecast.projectedMonthEndBalanceKobo < 0 ? 'text-red-700' : ''}`}>
            {formatNaira(data.forecast.projectedMonthEndBalanceKobo)}
          </p>
          <button onClick={() => setShowAssumptions((s) => !s)} className="mt-1 text-xs font-semibold text-brand">
            {showAssumptions ? 'Hide' : 'How we estimate this'}
          </button>
          {showAssumptions && (
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
              {data.forecast.assumptions.map((a) => <li key={a}>{a}</li>)}
              <li>This is an estimate, not a guarantee. Unrecorded or unusual spending will change it.</li>
            </ul>
          )}
        </section>
      )}

      {data.indicators.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">What we noticed</h2>
          {data.indicators.map((i) => (
            <div key={i.id} className={`flex gap-3 rounded-2xl p-3 ring-1 ${TONE[i.tone].ring}`}>
              <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold ring-1 ring-current ${TONE[i.tone].text}`}>
                {TONE[i.tone].icon}
              </span>
              <div>
                <p className={`text-sm font-semibold ${TONE[i.tone].text}`}>{i.title}</p>
                <p className="text-xs text-slate-600">{i.evidence}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Budgets (or spending breakdown when none are set) */}
      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{budgeted.length ? `Budgets · ${monthName}` : `Spending by category · ${monthName}`}</h2>
          <Link to={`/budgets?mode=${mode}`} className="text-sm font-semibold text-brand">
            {budgeted.length ? 'Edit' : 'Set budgets'}
          </Link>
        </div>
        {budgeted.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {budgeted.map((l) => {
              const m = METER[l.status as Exclude<Status, 'no_budget'>]
              const used = Math.min(l.spentKobo / (l.budgetKobo || 1), 1)
              return (
                <li key={l.category}>
                  <Link to={`/category?mode=${mode}&name=${encodeURIComponent(l.category)}&month=${data.period.month}`} className="block">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{l.category}</span>
                      <span className="text-slate-600">
                        {formatNaira(l.spentKobo)} of {formatNaira(l.budgetKobo!)}
                      </span>
                    </div>
                    <div className={`mt-1.5 h-2 overflow-hidden rounded ${m.track}`} role="meter" aria-valuenow={Math.round(used * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${l.category} budget used`}>
                      <div className={`h-full rounded ${m.fill}`} style={{ width: `${used * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      <span aria-hidden>{m.icon} </span>
                      {m.label} · {l.spentKobo > l.budgetKobo! ? `${formatNaira(l.spentKobo - l.budgetKobo!)} over` : `${formatNaira(l.budgetKobo! - l.spentKobo)} left`}
                      {l.status !== 'over' && ` · about ${formatNaira(l.projectedKobo)} by month end`}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {data.categories.filter((l) => l.spentKobo > 0).map((l) => (
              <li key={l.category}>
                <Link to={`/category?mode=${mode}&name=${encodeURIComponent(l.category)}&month=${data.period.month}`} className="block">
                  <div className="flex justify-between text-sm">
                    <span>{l.category}</span>
                    <span className="font-medium">{formatNaira(l.spentKobo)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div className="h-full rounded bg-brand" style={{ width: `${(l.spentKobo / maxSpend) * 100}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {o.uncategorised.count > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            {formatNaira(o.uncategorised.kobo)} in {o.uncategorised.count} transaction(s) isn't in any category yet.{' '}
            <Link to={`/review?mode=${mode}`} className="font-semibold text-brand">Review</Link>
          </p>
        )}
      </section>

      {b && b.salesByWeekday.some((d) => d.avgKobo > 0) && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <h2 className="font-semibold">Average sales by day</h2>
          <p className="mb-3 text-xs text-slate-500">Last 3 full months</p>
          <ul className="flex flex-col gap-2">
            {(() => {
              const max = Math.max(...b.salesByWeekday.map((d) => d.avgKobo), 1)
              const best = b.salesByWeekday.reduce((a, c) => (c.avgKobo > a.avgKobo ? c : a))
              return b.salesByWeekday.map((d) => (
                <li key={d.day} className="grid grid-cols-[2.5rem_1fr_5.5rem] items-center gap-2 text-sm" title={`${d.day}: ${formatNaira(d.avgKobo)} average`}>
                  <span className="text-slate-600">{d.day.slice(0, 3)}</span>
                  <div className="h-3 rounded bg-slate-100">
                    <div className="h-full rounded bg-brand" style={{ width: `${(d.avgKobo / max) * 100}%` }} />
                  </div>
                  <span className={`text-right ${d === best ? 'font-semibold' : 'text-slate-600'}`}>{formatNaira(d.avgKobo)}</span>
                </li>
              ))
            })()}
          </ul>
        </section>
      )}

      {due.length > 0 && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <h2 className="mb-2 font-semibold">Coming up this month</h2>
          <ul className="divide-y divide-slate-100">
            {due.map((r) => (
              <li key={r.key} className="flex justify-between py-2 text-sm">
                <span>
                  {r.name}
                  <span className="block text-xs text-slate-500">
                    {r.status === 'late' ? `Usually around the ${r.typicalDay}th, not seen yet` : r.dueInDays === 0 ? 'Usually today' : `Usually around the ${r.typicalDay}th · in ${r.dueInDays} day(s)`}
                  </span>
                </span>
                <span className={`font-medium ${r.direction === 'credit' ? 'text-emerald-700' : ''}`}>
                  {r.direction === 'credit' ? '+' : '−'}
                  {formatNaira(r.typicalAmountKobo)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
