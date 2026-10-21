// Analytics (Rejoice's design): one month's spending, money in and out by week, and where it went
// by category. Totals are added up from that month's transactions the same way the engine counts
// them; budgets and forecasts for the current month come from the dashboard.
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import AppShell from '../components/AppShell'
import { compact, daysIn, isIncome, isSpend, lagosDay, recentMonths, useDashboard, useTransactions, type Line, type Status } from '../app/data'
import { card, categoryStyle, CategoryIcon, Empty, Icon, merchant, monthLabel, naira } from '../app/kit'
import { useMode } from '../mode'

const WEEKS = [
  [1, 7],
  [8, 14],
  [15, 21],
  [22, 28],
  [29, 31],
] as const

const METER: Record<Exclude<Status, 'no_budget'>, { fill: string; track: string; label: string; icon: 'check' | 'alert' | 'x' }> = {
  on_track: { fill: '#980042', track: '#ffe4ee', label: 'On track', icon: 'check' },
  nearly_used: { fill: '#e8941f', track: '#fdecd6', label: 'Nearly used', icon: 'alert' },
  likely_over: { fill: '#e8941f', track: '#fdecd6', label: 'Likely to go over', icon: 'alert' },
  over: { fill: '#d64545', track: '#fde4e4', label: 'Over budget', icon: 'x' },
}

function Budgets({ lines, month }: { lines: Line[]; month: string }) {
  return (
    <section className={`${card} p-5`}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">Budgets</h2>
        <Link to="/budgets" className="text-[13px] font-medium text-brand">Edit</Link>
      </div>
      <ul className="flex flex-col gap-4">
        {lines.map((l) => {
          const m = METER[l.status as Exclude<Status, 'no_budget'>] ?? METER.on_track
          const used = Math.min(l.spentKobo / (l.budgetKobo || 1), 1)
          return (
            <li key={l.category}>
              <Link to={`/category?name=${encodeURIComponent(l.category)}&month=${month}`} className="block">
                <div className="flex items-baseline justify-between gap-2 text-[14px]">
                  <span className="font-medium">{l.category}</span>
                  <span className="text-[#6a6165]">
                    {naira(l.spentKobo)} of {naira(l.budgetKobo!)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: m.track }} role="meter" aria-valuenow={Math.round(used * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${l.category} budget used`}>
                  <div className="h-full rounded-full" style={{ width: `${used * 100}%`, background: m.fill }} />
                </div>
                <p className="mt-1 flex items-center gap-1 text-[12px] text-[#6a6165]">
                  <Icon name={m.icon} className="h-3.5 w-3.5" stroke={2.4} />
                  {m.label} · {l.spentKobo > l.budgetKobo! ? `${naira(l.spentKobo - l.budgetKobo!)} over` : `${naira(l.budgetKobo! - l.spentKobo)} left`}
                  {l.status !== 'over' && ` · about ${naira(l.projectedKobo)} by month end`}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function Analytics() {
  const { mode } = useMode()
  const dash = useDashboard(mode)
  const current = dash.data?.period.month
  const [picked, setPicked] = useState<string | null>(null)
  const month = picked ?? current
  const txs = useTransactions(mode, { month: month ?? undefined })
  const list = month ? (txs.data?.transactions ?? null) : null
  const b = dash.data?.overview.business ?? null

  const stats = useMemo(() => {
    if (!list || !month) return null
    const spend = list.filter(isSpend)
    const income = list.filter(isIncome)
    const total = spend.reduce((n, t) => n + t.amount_kobo, 0)
    const days = month === current && dash.data ? dash.data.period.day : daysIn(month)
    const last = daysIn(month)
    const weeks = WEEKS.filter(([s]) => s <= last).map(([s, e]) => {
      const end = Math.min(e, last)
      const inWeek = (t: (typeof list)[number]) => {
        const d = lagosDay(t.occurred_at)
        return d >= s && d <= end
      }
      return {
        label: `Wk ${Math.ceil(s / 7)}`,
        range: s === 1 ? `${monthLabel(month).slice(0, 3)} ${s}-${end}` : `${s}-${end}`,
        inflow: income.filter(inWeek).reduce((n, t) => n + t.amount_kobo, 0),
        outflow: spend.filter(inWeek).reduce((n, t) => n + t.amount_kobo, 0),
      }
    })
    const byCat = new Map<string, { kobo: number; merchants: string[] }>()
    for (const t of spend) {
      const key = t.category_status === 'pending' || !t.category ? 'Not categorised yet' : t.category
      const row = byCat.get(key) ?? { kobo: 0, merchants: [] }
      row.kobo += t.amount_kobo
      const m = merchant(t.narration).split(/[/,]/)[0].trim()
      if (m && !row.merchants.includes(m) && row.merchants.length < 2) row.merchants.push(m)
      byCat.set(key, row)
    }
    const cats = [...byCat.entries()].map(([category, r]) => ({ category, ...r, share: total ? r.kobo / total : 0 })).sort((a, b) => b.kobo - a.kobo)
    return {
      total,
      daily: Math.round(total / Math.max(days, 1)),
      count: list.length,
      weeks,
      inflow: income.reduce((n, t) => n + t.amount_kobo, 0),
      outflow: total,
      cats,
    }
  }, [list, month, current, dash.data])

  const max = Math.max(...(stats?.weeks.flatMap((w) => [w.inflow, w.outflow]) ?? [0]), 1)
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => compact(max * f))
  const p = (n: number) => `${(n * 100).toFixed(1)}%`
  const budgeted = month === current ? (dash.data?.categories.filter((l) => l.budgetKobo !== null) ?? []) : []

  const select = current && (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Month</span>
      <select
        value={month}
        onChange={(e) => setPicked(e.target.value)}
        className="appearance-none rounded-[10px] bg-[#f3f1f2] py-1.5 pl-3 pr-8 text-[13px] font-medium text-[#1a1215] outline-none focus:ring-2 focus:ring-brand/30"
      >
        {recentMonths(current, 6).map((m) => (
          <option key={m} value={m}>
            {monthLabel(m, !m.startsWith(current.slice(0, 4)))}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-2.5 h-4 w-4" />
    </label>
  )

  const summary = month && (
    <section className="lg:rounded-[18px] lg:bg-white lg:p-6 lg:ring-1 lg:ring-black/[0.06]">
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-[#5a5155]">{b ? 'Costs overview' : 'Spending Overview'}</span>
        {select}
      </div>
      <p className="mt-3 text-[32px] font-medium tracking-[-0.02em]">{stats ? naira(stats.total, true) : '…'}</p>
      <p className="text-[14px] text-[#5a5155]">Total {b ? 'costs' : 'spending'} in {monthLabel(month)}</p>
      <div className="mt-5 flex justify-between border-t border-black/[0.08] pt-4">
        <div>
          <p className="text-[13px] text-[#5a5155]">Daily Average</p>
          <p className="text-[19px] font-semibold">{stats ? naira(stats.daily, true) : '…'}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-[#5a5155]">Transactions</p>
          <p className="text-[19px] font-semibold">{stats?.count ?? '…'}</p>
        </div>
      </div>

      {stats && (
        <>
          <div className="relative mt-7 h-[180px] border-b border-black/[0.08] pl-12 lg:h-[220px]" role="img" aria-label={`Money in and out by week in ${monthLabel(month)}`}>
            {ticks.map((t, i) => (
              <span key={i} className="absolute left-0 -translate-y-1/2 text-[11px] text-[#a39a9e]" style={{ top: `${i * 25}%` }}>
                {t}
              </span>
            ))}
            {[0, 25, 50, 75].map((top) => (
              <span key={top} aria-hidden="true" className="absolute left-12 right-0 border-t border-dashed border-black/[0.06]" style={{ top: `${top}%` }} />
            ))}
            <div className="relative flex h-full items-end gap-3">
              {stats.weeks.map((w) => (
                <div key={w.label} className="flex h-full flex-1 items-end justify-center gap-1.5" title={`${w.label}: in ${naira(w.inflow)}, out ${naira(w.outflow)}`}>
                  <span className="w-[30%] max-w-[22px] rounded-t-[4px] bg-brand transition-[height] duration-500" style={{ height: `${(w.inflow / max) * 100}%` }} />
                  <span className="w-[30%] max-w-[22px] rounded-t-[4px] bg-[#1a1215] transition-[height] duration-500" style={{ height: `${(w.outflow / max) * 100}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pl-12 pt-1.5">
            {stats.weeks.map((w) => (
              <span key={w.label} className="flex-1 text-center">
                <span className="block text-[11px] font-semibold">{w.label}</span>
                <span className="block text-[10px] text-[#a39a9e]">{w.range}</span>
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 rounded-full border border-black/[0.08] px-4 py-2 text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" /> {b ? 'Sales' : 'Inflow'} ({compact(stats.inflow)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#1a1215]" /> {b ? 'Costs' : 'Outflow'} ({compact(stats.outflow)})
            </span>
          </div>
        </>
      )}
    </section>
  )

  const categories = stats && month && (
    <section className="lg:rounded-[18px] lg:bg-white lg:p-6 lg:ring-1 lg:ring-black/[0.06]">
      <h2 className="text-[20px] font-semibold">Category</h2>
      {stats.cats.length === 0 ? (
        <p className="mt-2 text-[14px] text-[#7a7175]">No spending recorded in {monthLabel(month)}.</p>
      ) : (
        <>
          <div className="mt-3 flex h-2 gap-[2px] overflow-hidden rounded-full">
            {stats.cats.map((c) => (
              <span key={c.category} style={{ width: p(c.share), background: categoryStyle(c.category === 'Not categorised yet' ? null : c.category).bar }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-[11px] font-semibold">
            {stats.cats.slice(0, 2).map((c) => (
              <span key={c.category}>
                {c.category} {p(c.share)}
              </span>
            ))}
            {stats.cats.length > 2 && <span>Other {p(stats.cats.slice(2).reduce((n, c) => n + c.share, 0))}</span>}
          </div>
          <div className="mt-2 divide-y divide-black/[0.05]">
            {stats.cats.map((c) => {
              const pending = c.category === 'Not categorised yet'
              return (
                <Link
                  key={c.category}
                  to={pending ? '/review' : `/category?name=${encodeURIComponent(c.category)}&month=${month}`}
                  className="flex items-center gap-3.5 py-3 transition hover:bg-black/[0.02]"
                >
                  <CategoryIcon category={pending ? null : c.category} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{c.category}</span>
                    <span className="block truncate text-[12px] text-[#8a8185]">{c.merchants.join(', ')}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[14px] font-semibold">{naira(c.kobo)}</span>
                    <span className="block text-[12px] text-[#8a8185]">{p(c.share)}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </section>
  )

  const weekdays = b && b.salesByWeekday.some((d) => d.avgKobo > 0) && (
    <section className={`${card} p-5`}>
      <h2 className="text-[17px] font-semibold">Average sales by day</h2>
      <p className="mb-3 text-[12px] text-[#8a8185]">Last 3 full months</p>
      <ul className="flex flex-col gap-2">
        {(() => {
          const top = Math.max(...b.salesByWeekday.map((d) => d.avgKobo), 1)
          const best = b.salesByWeekday.reduce((a, c) => (c.avgKobo > a.avgKobo ? c : a))
          return b.salesByWeekday.map((d) => (
            <li key={d.day} className="grid grid-cols-[2.5rem_1fr_5.5rem] items-center gap-2 text-[13px]" title={`${d.day}: ${naira(d.avgKobo)} average`}>
              <span className="text-[#6a6165]">{d.day.slice(0, 3)}</span>
              <div className="h-2.5 rounded-full bg-[#f4f2f3]">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(d.avgKobo / top) * 100}%` }} />
              </div>
              <span className={`text-right ${d === best ? 'font-semibold' : 'text-[#6a6165]'}`}>{naira(d.avgKobo)}</span>
            </li>
          ))
        })()}
      </ul>
    </section>
  )

  const empty = dash.data && !dash.data.categories.length && !dash.data.overview.incomeKobo && !dash.data.overview.spendKobo && list && !list.length

  return (
    <AppShell title="Analytics">
      {(dash.error || txs.error) && <p className="mb-4 text-[14px] text-[#d64545]">{dash.error || txs.error}</p>}
      {!dash.data && !dash.error && <p className="text-[14px] text-[#8a8185]">Loading…</p>}
      {empty ? (
        <Empty title="Nothing to analyse yet" body="Add your transactions and your monthly picture shows up here." action={{ label: 'Add transactions', to: '/import' }} />
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
          <div className="flex min-w-0 flex-col gap-8 lg:gap-6">
            {summary}
            {budgeted.length > 0 && current && <Budgets lines={budgeted} month={current} />}
            {weekdays}
          </div>
          <div className="min-w-0">{categories}</div>
        </div>
      )}
    </AppShell>
  )
}
