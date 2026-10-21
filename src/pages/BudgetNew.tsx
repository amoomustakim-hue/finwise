// Create Budget (Rejoice's design): one category, one limit. Budgets are stored per month, so a
// weekly limit is saved as its monthly equivalent. Saving keeps every other budget as it was.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import AppShell from '../components/AppShell'
import { ErrorText } from '../components/ui'
import { categoryStyle, Icon, monthLabel, naira } from '../app/kit'
import { api } from '../lib/api'
import { useMode } from '../mode'

type Item = { category: string; amountKobo: number | null; suggestedKobo: number | null; avgMonthlyKobo: number; spentKobo: number }
type Period = 'weekly' | 'monthly'

const WEEKS_PER_MONTH = 52 / 12
const roundTo = (kobo: number, step: number) => Math.round(kobo / step) * step
const toPeriod = (monthlyKobo: number, p: Period) => (p === 'weekly' ? roundTo(monthlyKobo / WEEKS_PER_MONTH, 50000) : roundTo(monthlyKobo, 100000))
const SHOWN = 6

export default function BudgetNew() {
  const { mode } = useMode()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [data, setData] = useState<{ items: Item[]; month: string } | null>(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [period, setPeriod] = useState<Period>('monthly')
  const [value, setValue] = useState('') // naira, as typed, for the chosen period
  const [all, setAll] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ items: Item[]; month: string }>(`/budgets?mode=${mode}`)
      .then((r) => {
        setData(r)
        setCategory((c) => (r.items.some((i) => i.category === c) ? c : (r.items[0]?.category ?? '')))
      })
      .catch((e) => setError((e as Error).message))
  }, [mode])

  const item = data?.items.find((i) => i.category === category)
  const startMonthly = item ? (item.amountKobo ?? item.suggestedKobo ?? roundTo(item.avgMonthlyKobo * 0.9, 100000)) : 0

  // Picking a category (or the period) starts the limit from its saved amount or our suggestion.
  useEffect(() => {
    if (item) setValue(startMonthly ? String(toPeriod(startMonthly, period) / 100) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.category])

  function switchPeriod(p: Period) {
    if (p === period) return
    const n = (Number(value.replace(/[^\d.]/g, '')) || 0) * 100
    const monthly = period === 'weekly' ? n * WEEKS_PER_MONTH : n
    setValue(n ? String(toPeriod(monthly, p) / 100) : '')
    setPeriod(p)
  }

  const limitKobo = Math.round((Number(value.replace(/[^\d.]/g, '')) || 0) * 100)
  const monthlyKobo = period === 'weekly' ? roundTo(limitKobo * WEEKS_PER_MONTH, 100) : limitKobo
  const suggested = item?.suggestedKobo ?? (item?.avgMonthlyKobo ? roundTo(item.avgMonthlyKobo * 0.9, 100000) : null)
  const items = useMemo(() => data?.items ?? [], [data])
  const shown = useMemo(() => {
    if (all) return items
    const top = items.slice(0, SHOWN)
    return item && !top.includes(item) ? [...top.slice(0, SHOWN - 1), item] : top
  }, [all, items, item])

  async function save() {
    if (!data || !item) return
    setBusy(true)
    setError('')
    try {
      // PUT replaces the month's whole set, so send every saved budget along with this one.
      const out = data.items
        .filter((i) => i.amountKobo && i.category !== item.category)
        .map((i) => ({ category: i.category, amountKobo: i.amountKobo! }))
      out.push({ category: item.category, amountKobo: monthlyKobo })
      await api('/budgets', { method: 'PUT', body: { mode, items: out } })
      navigate('/analytics')
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const diff = item && item.avgMonthlyKobo ? item.avgMonthlyKobo - monthlyKobo : null

  return (
    <AppShell title="Create Budget">
      <div className="mx-auto max-w-[560px]">
        <p className="-mt-3 mb-5 text-center text-[13px] text-[#7a7175] lg:-mt-5 lg:text-left">Set a spending limit and stay in control.</p>
        {error && !data && <ErrorText>{error}</ErrorText>}
        {!data && !error && <p className="text-[14px] text-[#8a8185]">Loading…</p>}

        {data && item && (
          <>
            {suggested ? (
              <section className="rounded-[16px] bg-[#ffe3ec] p-5">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-brand">Suggested {period} target</p>
                <p className="mt-1 text-[28px] font-semibold tracking-[-0.01em]">{naira(toPeriod(suggested, period))}</p>
                <p className="mt-1 flex items-center justify-between gap-3 text-[13px] text-[#6a5f64]">
                  Based on your recent {item.category.toLowerCase()} spending
                  <button type="button" onClick={() => setValue(String(toPeriod(suggested, period) / 100))} className="shrink-0 font-semibold text-brand">
                    Use this
                  </button>
                </p>
              </section>
            ) : (
              <section className="rounded-[16px] bg-[#f4f2f3] p-5 text-[13px] text-[#6a6165]">No recent spending in {item.category}, so there's no suggestion. Set any limit you like.</section>
            )}

            <div className="mt-6 flex items-baseline justify-between text-[14px]">
              <span className="font-semibold">Choose a category</span>
              <button type="button" onClick={() => setAll((a) => !a)} className="text-[13px] text-brand">
                {all ? 'Show fewer' : `${items.length} available`}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {shown.map((i) => {
                const on = i.category === category
                const s = categoryStyle(i.category)
                return (
                  <button
                    key={i.category}
                    type="button"
                    onClick={() => setCategory(i.category)}
                    aria-pressed={on}
                    className={`flex min-w-0 items-center gap-2.5 rounded-[12px] p-3 text-left text-[13px] transition ${on ? 'bg-white ring-[1.5px] ring-brand' : 'bg-[#f4f2f3] hover:bg-[#ece8ea]'}`}
                  >
                    <span className={on ? 'text-brand' : 'text-[#5a5155]'}>
                      <Icon name={s.icon} />
                    </span>
                    <span className={`min-w-0 flex-1 truncate ${on ? 'font-semibold text-brand' : 'text-[#2a2226]'}`}>{i.category}</span>
                    {on && (
                      <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-brand text-white">
                        <Icon name="check" className="h-3 w-3" stroke={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <label className="mt-7 block">
              <span className="flex justify-between text-[12px] font-semibold uppercase tracking-wide text-[#7a7175]">
                Budget limit <span className="normal-case tracking-normal text-brand">Tap to edit</span>
              </span>
              <span className="mt-2 flex items-center gap-2 border-b border-black/[0.08] pb-2 focus-within:border-brand">
                <span className="text-[28px] font-semibold">₦</span>
                <input
                  inputMode="numeric"
                  aria-label={`${period === 'weekly' ? 'Weekly' : 'Monthly'} limit for ${item.category}, in naira`}
                  value={value ? Number(value.replace(/[^\d.]/g, '') || 0).toLocaleString('en-NG') : ''}
                  onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                  className="min-w-0 flex-1 bg-transparent text-[28px] font-semibold outline-none"
                />
                <span className="rounded-[5px] bg-[#f1eef0] px-1.5 py-0.5 text-[11px] text-[#7a7175]">NGN</span>
                <Icon name="pencil" className="h-4 w-4 text-[#7a7175]" />
              </span>
            </label>

            <p className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-[#7a7175]">Budget duration</p>
            <div className="mt-2 grid grid-cols-2 rounded-[12px] bg-[#f4f2f3] p-1 text-[14px]" role="tablist" aria-label="Budget duration">
              {(['weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={period === p}
                  onClick={() => switchPeriod(p)}
                  className={`rounded-[9px] py-2.5 capitalize transition ${period === p ? 'bg-white font-semibold text-brand shadow-[0_2px_6px_rgb(0_0_0/0.08)]' : 'text-[#5a5155]'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            {limitKobo > 0 && (
              <div className="mt-5 flex gap-3 rounded-[14px] bg-[#f4f2f3] p-4 text-[13px]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ffe3ec] text-brand">
                  <Icon name={diff !== null && diff > 0 ? 'trendDown' : 'trend'} className="h-4 w-4" />
                </span>
                <span className="text-[#4a4246]">
                  {diff === null
                    ? `You haven't spent on ${item.category.toLowerCase()} recently.`
                    : diff > 0
                      ? `This is ${naira(diff)} below your recent average ${item.category.toLowerCase()} spending of ${naira(item.avgMonthlyKobo)}/month.`
                      : diff < 0
                        ? `This is ${naira(-diff)} above your recent average ${item.category.toLowerCase()} spending of ${naira(item.avgMonthlyKobo)}/month, so it leaves some room.`
                        : `This matches your recent average ${item.category.toLowerCase()} spending of ${naira(item.avgMonthlyKobo)}/month.`}
                  {diff !== null && diff > 0 && <span className="mt-1 block text-brand">• Estimated monthly savings: {naira(diff)}</span>}
                  <span className="mt-1 block text-[#8a8185]">
                    {period === 'weekly' ? `Saved as ${naira(monthlyKobo)} for ${monthLabel(data.month)}. ` : ''}
                    You'll see a warning once 80% is used.
                  </span>
                </span>
              </div>
            )}

            {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}
            <button
              type="button"
              onClick={save}
              disabled={busy || limitKobo <= 0}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_28px_-14px_rgb(152_0_66/0.7)] transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Saving…' : item.amountKobo ? 'Update budget' : 'Create budget'} <span aria-hidden="true">→</span>
            </button>
            <p className="mt-3 text-center text-[12px] text-[#8a8185]">
              Budgets are plans inside FinWise; they don't move or block money in your bank.{' '}
              <Link to="/budgets" className="font-medium text-brand">See all budgets</Link>
            </p>
          </>
        )}
      </div>
    </AppShell>
  )
}
