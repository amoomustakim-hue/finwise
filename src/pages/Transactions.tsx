// Activity (Rejoice's design): search, All / Income / Expenses, this month's money in and out, and
// every transaction (most recent 500) grouped by day.
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import AppShell from '../components/AppShell'
import TxGroups from '../app/TxGroups'
import { recentMonths, useDashboard, useTransactions } from '../app/data'
import { card, Icon, merchant, monthLabel, naira } from '../app/kit'
import { useMode } from '../mode'

type Show = 'all' | 'income' | 'expenses'

export default function Transactions() {
  const { mode } = useMode()
  const dash = useDashboard(mode)
  const [month, setMonth] = useState('')
  const txs = useTransactions(mode, { month: month || undefined })
  const [q, setQ] = useState('')
  const [show, setShow] = useState<Show>('all')
  const [filters, setFilters] = useState(false)
  const [unanswered, setUnanswered] = useState(false)
  const list = txs.data?.transactions ?? null
  const d = dash.data
  const b = d?.overview.business ?? null

  const rows = useMemo(() => {
    if (!list) return null
    const needle = q.trim().toLowerCase()
    return list.filter(
      (t) =>
        (show === 'all' || (show === 'income' ? t.direction === 'credit' : t.direction === 'debit')) &&
        (!unanswered || t.category_status !== 'confirmed') &&
        (!needle || merchant(t.narration).toLowerCase().includes(needle) || (t.category ?? '').toLowerCase().includes(needle) || String(t.amount_kobo / 100).includes(needle)),
    )
  }, [list, q, show, unanswered])

  const chip = (on: boolean) => `rounded-full px-4 py-1.5 text-[13px] transition ${on ? 'bg-brand font-semibold text-white' : 'border border-black/10 text-[#2a2226] hover:bg-black/[0.03]'}`
  const hasDemo = !!list?.some((t) => t.source === 'demo')
  const active = Number(!!month) + Number(unanswered)

  return (
    <AppShell title="Activity">
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[24px] font-semibold tracking-[-0.01em] lg:hidden">Activity</p>
              <p className="text-[13px] text-[#7a7175]">Track your money in and out</p>
            </div>
            <button
              type="button"
              onClick={() => setFilters((f) => !f)}
              aria-expanded={filters}
              aria-label="Filters"
              className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${filters ? 'border-brand text-brand' : 'border-black/10'}`}
            >
              <Icon name="filter" />
              {active > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-brand text-[10px] font-bold text-white">{active}</span>}
            </button>
          </div>

          {filters && (
            <div className={`${card} mt-3 flex flex-col gap-3 p-4`}>
              {d && (
                <label className="flex items-center justify-between gap-3 text-[14px]">
                  Month
                  <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-[10px] bg-[#f4f2f3] px-3 py-1.5 text-[13px] outline-none">
                    <option value="">Latest 500</option>
                    {recentMonths(d.period.month, 12).map((m) => (
                      <option key={m} value={m}>
                        {monthLabel(m, true)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex items-center justify-between gap-3 text-[14px]">
                Only ones still needing an answer
                <input type="checkbox" checked={unanswered} onChange={(e) => setUnanswered(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
              </label>
            </div>
          )}

          <label className="mt-4 flex items-center gap-3 rounded-[12px] border border-black/10 bg-white px-4 py-3 text-[#9a9195] focus-within:border-brand/50">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions" aria-label="Search transactions" className="min-w-0 flex-1 bg-transparent text-[14px] text-[#1a1215] outline-none placeholder:text-[#9a9195]" />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="text-[#9a9195] hover:text-[#1a1215]">
                <Icon name="x" className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="mt-4 flex gap-2" role="tablist" aria-label="Show">
            {(['all', 'income', 'expenses'] as const).map((s) => (
              <button key={s} type="button" role="tab" aria-selected={show === s} onClick={() => setShow(s)} className={`${chip(show === s)} capitalize`}>
                {s}
              </button>
            ))}
          </div>

          {d && (
            <div className="mt-4 grid grid-cols-2 gap-3 lg:hidden">
              <InOut label={b ? 'Sales' : 'Money in'} kobo={b ? b.revenueKobo : d.overview.incomeKobo} credit month={d.period.month} />
              <InOut label={b ? 'Costs' : 'Money out'} kobo={b ? b.costsKobo : d.overview.spendKobo} month={d.period.month} />
            </div>
          )}

          <div className="mt-6 flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold">{month ? monthLabel(month, true) : 'Recent transactions'}</h2>
            {rows && <span className="text-[12px] text-[#8a8185]">{rows.length} shown</span>}
          </div>
          <div className="mt-2">
            {txs.error && <p className="text-[14px] text-[#d64545]">{txs.error}</p>}
            {!rows && !txs.error && <p className="py-3 text-[14px] text-[#8a8185]">Loading transactions…</p>}
            {list && !list.length && !month && (
              <div className={`${card} p-6 text-center`}>
                <p className="font-semibold">No transactions yet</p>
                <p className="mt-1 text-[14px] text-[#7a7175]">Link your bank or upload a statement to get started.</p>
                <Link to={`/import?mode=${mode}`} className="mt-4 inline-block rounded-[12px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white">
                  Add transactions
                </Link>
              </div>
            )}
            {rows && list && (list.length > 0 || month) && rows.length === 0 && <p className="py-6 text-center text-[14px] text-[#8a8185]">Nothing matches.</p>}
            {rows && rows.length > 0 && <TxGroups txs={rows} />}
          </div>
        </div>

        <aside className="hidden flex-col gap-3 lg:sticky lg:top-8 lg:flex">
          {d && (
            <>
              <InOut label={b ? 'Sales' : 'Money in'} kobo={b ? b.revenueKobo : d.overview.incomeKobo} credit month={d.period.month} />
              <InOut label={b ? 'Costs' : 'Money out'} kobo={b ? b.costsKobo : d.overview.spendKobo} month={d.period.month} />
            </>
          )}
          {hasDemo && <p className="rounded-[12px] bg-[#fff4e0] px-3 py-2 text-[12px] text-[#7a4b00]">Includes sample data</p>}
        </aside>
      </div>
    </AppShell>
  )
}

function InOut({ label, kobo, credit = false, month }: { label: string; kobo: number; credit?: boolean; month: string }) {
  const c = credit ? '#1f8a5b' : '#e0533a'
  return (
    <div className="rounded-[14px] border border-black/[0.08] bg-white p-4">
      <p className="flex items-center gap-2 text-[13px] text-[#4a4246]">
        <span className="grid h-7 w-7 place-items-center rounded-full" style={{ color: c, background: `${c}1a` }}>
          <Icon name={credit ? 'down' : 'up'} className="h-4 w-4" stroke={2.2} />
        </span>
        {label}
      </p>
      <p className="mt-3 truncate text-[20px] font-semibold" style={{ color: c }}>
        {naira(kobo)}
      </p>
      <p className="text-[11px] text-[#9a9195]">{monthLabel(month)} so far</p>
    </div>
  )
}
