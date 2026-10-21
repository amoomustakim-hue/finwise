// Dashboard for one mode. Displays numbers computed by the server engine; does no maths of its own
// beyond formatting. Status is always shown as icon + text, never colour alone.
// Layout: phone = one column; desktop = headline row, then a main column and a side column.
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
export type DashboardData = {
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

const card = 'rounded-2xl bg-white p-4 ring-1 ring-slate-200 lg:p-5'

const pctText = (p: number | null, upIsGood: boolean) => {
  if (p === null) return null
  const good = p >= 0 === upIsGood
  return <span className={good ? 'text-emerald-700' : 'text-red-700'}>{p >= 0 ? '▲' : '▼'} {Math.abs(p)}% vs last month (same day)</span>
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className={card}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold lg:text-xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs">{sub}</p>}
    </div>
  )
}

export default function Dashboard({
  mode,
  version,
  beforeMain,
  afterMain,
  onData,
}: {
  mode: Mode
  version: number
  beforeMain?: ReactNode // e.g. the "new transaction" card
  afterMain?: ReactNode // e.g. the transaction list
  onData?: (d: DashboardData) => void
}) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [showAssumptions, setShowAssumptions] = useState(false)

  useEffect(() => {
    api<DashboardData>(`/dashboard?mode=${mode}`)
      .then((d) => {
        setData(d)
        onData?.(d)
      })
      .catch((e) => setError(e.message))
  }, [mode, version, onData])

  const empty = data && !data.categories.length && !data.overview.incomeKobo && !data.overview.spendKobo
  if (error || !data || empty) {
    return (
      <div className="flex flex-col gap-4">
        {error && <p className="text-red-700">{error}</p>}
        {!data && !error && <p className="text-slate-500">Loading your dashboard…</p>}
        {beforeMain}
        {afterMain}
      </div>
    )
  }

  const o = data.overview
  const b = o.business
  const monthName = new Date(`${data.period.month}-01T12:00:00Z`).toLocaleString('en-GB', { month: 'long' })
  const budgeted = data.categories.filter((l) => l.budgetKobo !== null)
  const due = data.recurring.filter((r) => r.status !== 'paid')
  const maxSpend = Math.max(...data.categories.map((l) => l.spentKobo), 1)

  const hero = (
    <section className={`${card} lg:col-span-5`}>
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
  )

  const tiles = (
    <div className="grid grid-cols-2 gap-3 lg:col-span-7 lg:gap-4">
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
          <Tile label="Regular payments still due" value={formatNaira(due.filter((r) => r.direction === 'debit').reduce((n, r) => n + r.typicalAmountKobo, 0))} sub={<span className="text-slate-500">{due.filter((r) => r.direction === 'debit').length} this month</span>} />
          <Tile label="Awaiting a category" value={String(o.uncategorised.count)} sub={<span className="text-slate-500">{formatNaira(o.uncategorised.kobo)} this month</span>} />
        </>
      )}
    </div>
  )

  const forecast = data.forecast.projectedMonthEndBalanceKobo !== null && (
    <section className={card}>
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
  )

  const noticed = data.indicators.length > 0 && (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">What we noticed</h2>
      <div className="grid gap-2 xl:grid-cols-2">
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
      </div>
    </section>
  )

  const budgets = (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{budgeted.length ? `Budgets · ${monthName}` : `Spending by category · ${monthName}`}</h2>
        <Link to="/budgets" className="text-sm font-semibold text-brand">{budgeted.length ? 'Edit' : 'Set budgets'}</Link>
      </div>
      {budgeted.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2 md:gap-x-8">
          {budgeted.map((l) => {
            const m = METER[l.status as Exclude<Status, 'no_budget'>]
            const used = Math.min(l.spentKobo / (l.budgetKobo || 1), 1)
            return (
              <li key={l.category}>
                <Link to={`/category?name=${encodeURIComponent(l.category)}&month=${data.period.month}`} className="block">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{l.category}</span>
                    <span className="text-slate-600">{formatNaira(l.spentKobo)} of {formatNaira(l.budgetKobo!)}</span>
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
        <ul className="grid gap-2.5 md:grid-cols-2 md:gap-x-8">
          {data.categories.filter((l) => l.spentKobo > 0).map((l) => (
            <li key={l.category}>
              <Link to={`/category?name=${encodeURIComponent(l.category)}&month=${data.period.month}`} className="block">
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
          <Link to="/review" className="font-semibold text-brand">Review</Link>
        </p>
      )}
    </section>
  )

  const weekdays = b && b.salesByWeekday.some((d) => d.avgKobo > 0) && (
    <section className={card}>
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
  )

  const upcoming = due.length > 0 && (
    <section className={card}>
      <h2 className="mb-2 font-semibold">Coming up this month</h2>
      <ul className="divide-y divide-slate-100">
        {due.map((r) => (
          <li key={r.key} className="flex justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate">{r.name}</span>
              <span className="block text-xs text-slate-500">
                {r.status === 'late' ? `Usually around the ${r.typicalDay}th, not seen yet` : r.dueInDays === 0 ? 'Usually today' : `Around the ${r.typicalDay}th · in ${r.dueInDays} day(s)`}
              </span>
            </span>
            <span className={`shrink-0 font-medium ${r.direction === 'credit' ? 'text-emerald-700' : ''}`}>
              {r.direction === 'credit' ? '+' : '−'}
              {formatNaira(r.typicalAmountKobo)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        {hero}
        {tiles}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-8 lg:gap-6">
          {beforeMain}
          {noticed}
          {budgets}
          {afterMain}
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-4 lg:gap-6">
          {forecast}
          {weekdays}
          {upcoming}
        </div>
      </div>
    </div>
  )
}
