// Budgets: every spending category's limit for this month, edited together. Pre-filled from the
// last 3 months' average when none are set.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AppShell from '../components/AppShell'
import { ErrorText } from '../components/ui'
import { CategoryIcon, Icon, monthLabel, naira } from '../app/kit'
import { api } from '../lib/api'
import { useMode } from '../mode'

type Item = { category: string; amountKobo: number | null; suggestedKobo: number | null; avgMonthlyKobo: number; spentKobo: number }

const toKobo = (v: string) => Math.round((Number(v.replace(/[^\d.]/g, '')) || 0) * 100)

export default function Budgets() {
  const { mode } = useMode()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[] | null>(null)
  const [month, setMonth] = useState('')
  const [hasBudgets, setHasBudgets] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({}) // naira, as typed
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ items: Item[]; hasBudgets: boolean; month: string }>(`/budgets?mode=${mode}`).then((r) => {
      setItems(r.items)
      setMonth(r.month)
      setHasBudgets(r.hasBudgets)
      const start: Record<string, string> = {}
      for (const i of r.items) {
        const k = r.hasBudgets ? i.amountKobo : i.suggestedKobo
        start[i.category] = k ? String(Math.round(k / 100)) : ''
      }
      setValues(start)
    })
  }, [mode])

  async function save() {
    setBusy(true)
    setError('')
    try {
      const out = Object.entries(values).map(([category, v]) => ({ category, amountKobo: toKobo(v) }))
      await api('/budgets', { method: 'PUT', body: { mode, items: out } })
      navigate('/analytics')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const planned = Object.values(values).reduce((n, v) => n + toKobo(v), 0)
  const spent = items?.filter((i) => toKobo(values[i.category] ?? '') > 0).reduce((n, i) => n + i.spentKobo, 0) ?? 0
  const used = planned ? Math.min(spent / planned, 1) : 0

  return (
    <AppShell
      title={mode === 'business' ? 'Operating budget' : 'Budgets'}
      right={
        <Link to="/budgets/new" aria-label="Create a budget" className="grid h-10 w-10 place-items-center rounded-full bg-blush text-brand">
          <Icon name="plus" />
        </Link>
      }
    >
      <div className="mx-auto max-w-[760px] lg:mx-0">
        <section className="relative overflow-hidden rounded-[18px] bg-brand-grad p-5 text-white">
          <span aria-hidden="true" className="absolute -right-10 -top-10 h-36 w-36 rounded-full border-[6px] border-white/10" />
          <p className="text-[13px] text-white/80">Planned for {month ? monthLabel(month) : 'this month'}</p>
          <p className="mt-1 text-[30px] font-semibold tracking-[-0.02em]">{items ? naira(planned) : '…'}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${used * 100}%` }} />
          </div>
          <p className="mt-2 flex justify-between text-[12px] text-white/80">
            <span>{naira(spent)} spent in budgeted categories</span>
            <span>{Math.round(used * 100)}%</span>
          </p>
        </section>

        <p className="mt-5 text-[13px] text-[#7a7175]">
          {hasBudgets ? 'Change any amount. Leave one empty for no budget.' : 'We filled these in from your average over the last 3 months. Adjust them to fit your plan.'}
        </p>

        {!items && <p className="mt-4 text-[14px] text-[#8a8185]">Loading…</p>}
        {items && (
          <ul className="mt-3 flex flex-col gap-2.5">
            {items.map((i) => {
              const limit = toKobo(values[i.category] ?? '')
              const pct = limit ? i.spentKobo / limit : 0
              const color = pct > 1 ? '#d64545' : pct >= 0.8 ? '#e8941f' : '#980042'
              return (
                <li key={i.category} className="rounded-[16px] bg-white p-4 ring-1 ring-black/[0.06]">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={i.category} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{i.category}</p>
                      <p className="truncate text-[12px] text-[#8a8185]">
                        {i.avgMonthlyKobo ? `Avg ${naira(i.avgMonthlyKobo)}/month` : 'No recent spending'}
                      </p>
                    </div>
                    <label className="flex w-[120px] shrink-0 items-center gap-1 rounded-[12px] bg-[#f4f2f3] px-3 py-2 focus-within:bg-white focus-within:ring-[1.5px] focus-within:ring-brand">
                      <span className="text-[14px] text-[#8a8185]">₦</span>
                      <input
                        inputMode="numeric"
                        aria-label={`${i.category} budget`}
                        className="w-full min-w-0 bg-transparent text-right text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-[#b0a6aa]"
                        value={values[i.category] ? Number(values[i.category].replace(/[^\d]/g, '')).toLocaleString('en-NG') : ''}
                        onChange={(e) => setValues((v) => ({ ...v, [i.category]: e.target.value.replace(/[^\d]/g, '') }))}
                        placeholder="None"
                      />
                    </label>
                  </div>
                  {limit > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#f4f2f3]">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 1) * 100}%`, background: color }} />
                      </div>
                      <p className="mt-1.5 text-[12px] text-[#8a8185]">
                        {naira(i.spentKobo)} spent · {i.spentKobo > limit ? <span className="text-[#d64545]">{naira(i.spentKobo - limit)} over</span> : `${naira(limit - i.spentKobo)} left`}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="sticky bottom-[88px] z-10 mt-5 lg:bottom-6">
          <ErrorText>{error}</ErrorText>
          <button
            onClick={save}
            disabled={busy || !items}
            className="mt-2 w-full rounded-[14px] bg-brand py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_28px_-12px_rgb(152_0_66/0.7)] transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save budgets'}
          </button>
        </div>
        <p className="mt-3 text-center text-[12px] text-[#8a8185]">Budgets are plans inside FinWise; they don't move or block money in your bank.</p>
      </div>
    </AppShell>
  )
}
