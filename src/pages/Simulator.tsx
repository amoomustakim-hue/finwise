// Decision Simulator: pick a decision, adjust it, see how your projected balance changes.
// All maths happens on the server (deterministic); this page only collects inputs and shows results.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { categoriesFor } from '../../shared/categories'
import AppShell from '../components/AppShell'
import BalanceChart from '../components/BalanceChart'
import { api, type Mode } from '../lib/api'
import { formatNaira } from '../lib/format'
import { card, Icon, type IconName } from '../app/kit'
import { useMode } from '../mode'

type Field =
  | { key: string; label: string; kind: 'naira'; min: number; max: number; step: number }
  | { key: string; label: string; kind: 'days' | 'pct'; min: number; max: number; step: number }
  | { key: string; label: string; kind: 'category' }

type Preset = { type: string; title: string; question: string; fields: Field[]; defaults: Record<string, number | string> }

const PRESETS: Record<Mode, Preset[]> = {
  personal: [
    { type: 'purchase', title: 'Make a purchase', question: 'Can I afford it?', fields: [
      { key: 'amountKobo', label: 'Amount', kind: 'naira', min: 1000, max: 2000000, step: 1000 },
      { key: 'inDays', label: 'When (days from today)', kind: 'days', min: 1, max: 30, step: 1 }], defaults: { amountKobo: 5000000, inDays: 3 } },
    { type: 'salary_delay', title: 'Salary comes late', question: 'What if my salary is delayed?', fields: [
      { key: 'days', label: 'Days late', kind: 'days', min: 1, max: 30, step: 1 }], defaults: { days: 14 } },
    { type: 'expense_change', title: 'A cost goes up', question: 'What if my rent or bills rise?', fields: [
      { key: 'category', label: 'Which cost', kind: 'category' },
      { key: 'monthlyKobo', label: 'Extra per month', kind: 'naira', min: 1000, max: 500000, step: 1000 }], defaults: { category: 'Rent', monthlyKobo: 2000000 } },
    { type: 'save_monthly', title: 'Save every month', question: 'What if I save more?', fields: [
      { key: 'monthlyKobo', label: 'Amount per month', kind: 'naira', min: 1000, max: 500000, step: 1000 }], defaults: { monthlyKobo: 2000000 } },
  ],
  business: [
    { type: 'hire', title: 'Hire someone', question: 'Can I afford a new staff member?', fields: [
      { key: 'monthlyKobo', label: 'Monthly salary', kind: 'naira', min: 10000, max: 1000000, step: 5000 }], defaults: { monthlyKobo: 6000000 } },
    { type: 'revenue_drop', title: 'Sales drop', question: 'What if sales fall?', fields: [
      { key: 'pct', label: 'Drop in sales', kind: 'pct', min: 5, max: 60, step: 5 }], defaults: { pct: 20 } },
    { type: 'late_payment', title: 'A customer pays late', question: 'What if a big payment is late?', fields: [
      { key: 'amountKobo', label: 'Amount owed', kind: 'naira', min: 10000, max: 5000000, step: 10000 },
      { key: 'dueInDays', label: 'Due in (days)', kind: 'days', min: 1, max: 30, step: 1 },
      { key: 'lateDays', label: 'Days late', kind: 'days', min: 1, max: 30, step: 1 }], defaults: { amountKobo: 20000000, dueInDays: 7, lateDays: 14 } },
    { type: 'supplier_increase', title: 'Supplier prices rise', question: 'What if stock costs more?', fields: [
      { key: 'pct', label: 'Price increase', kind: 'pct', min: 1, max: 50, step: 1 }], defaults: { pct: 10 } },
    { type: 'purchase', title: 'Buy equipment', question: 'Can the business afford it?', fields: [
      { key: 'amountKobo', label: 'Amount', kind: 'naira', min: 10000, max: 10000000, step: 10000 },
      { key: 'inDays', label: 'When (days from today)', kind: 'days', min: 1, max: 30, step: 1 }], defaults: { amountKobo: 30000000, inDays: 5 } },
  ],
}

type Result = {
  verdict: 'ok' | 'tight' | 'shortfall'
  headline: string
  recommendation: string
  days: { date: string; baselineKobo: number; scenarioKobo: number }[]
  baseline: { lowestKobo: number; lowestDate: string; monthEndKobo: number }
  result: { lowestKobo: number; lowestDate: string; monthEndKobo: number }
  monthlyProfit: { baselineKobo: number; scenarioKobo: number } | null
  assumptions: string[]
}

const VERDICT: Record<Result['verdict'], { label: string; icon: IconName; fg: string; bg: string; ring: string }> = {
  ok: { label: 'Looks manageable', icon: 'check', fg: '#1f6b4f', bg: '#e2f3ea', ring: '#bfe3cf' },
  tight: { label: 'Possible, but tight', icon: 'alert', fg: '#9a5b00', bg: '#fff4e0', ring: '#f2d29b' },
  shortfall: { label: 'You could run short', icon: 'x', fg: '#c03535', bg: '#fde4e4', ring: '#f5c2c2' },
}

const ICONS: Record<string, IconName> = {
  purchase: 'bag',
  salary_delay: 'calendar',
  expense_change: 'trend',
  save_monthly: 'piggy',
  hire: 'users',
  revenue_drop: 'trendDown',
  late_payment: 'receipt',
  supplier_increase: 'box',
}

const fmtDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function Simulator() {
  const { mode } = useMode()
  const [params] = useSearchParams()
  const presets = PRESETS[mode]
  const [type, setType] = useState(() => presets.find((p) => p.type === params.get('scenario'))?.type ?? presets[0].type)
  const preset = presets.find((p) => p.type === type) ?? presets[0]
  const [values, setValues] = useState<Record<string, number | string>>(preset.defaults)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Switching mode or scenario resets inputs to that scenario's defaults.
  useEffect(() => {
    const p = PRESETS[mode].find((x) => x.type === type) ?? PRESETS[mode][0]
    if (p.type !== type) setType(p.type)
    // An amount from "Ask FinWise" (?scenario=purchase&amount=50000, in naira) fills the first money field.
    const asked = Number(params.get('amount'))
    const money = p.fields.find((f) => f.kind === 'naira')
    if (money && money.kind === 'naira' && asked > 0 && params.get('scenario') === p.type) {
      setValues({ ...p.defaults, [money.key]: Math.min(Math.max(Math.round(asked), money.min), money.max) * 100 })
    } else {
      setValues(p.defaults)
    }
  }, [mode, type, params])

  // Recalculate shortly after inputs stop changing.
  const body = useMemo(() => JSON.stringify({ mode, scenario: { type: preset.type, ...values } }), [mode, preset.type, values])
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      api<Result>('/simulator', { method: 'POST', body: JSON.parse(body) })
        .then((r) => {
          setResult(r)
          setError('')
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(t)
  }, [body])

  const spendCats = categoriesFor(mode, 'debit').filter((c) => c !== 'Bank charges')

  const v = result && VERDICT[result.verdict]
  const shown = (f: Field) =>
    f.kind === 'naira' ? formatNaira(Number(values[f.key])) : f.kind === 'pct' ? `${values[f.key]}%` : `${values[f.key]} day${values[f.key] === 1 ? '' : 's'}`

  return (
    <AppShell title="Decision Simulator">
      <p className="-mt-3 mb-5 text-center text-[13px] text-[#7a7175] lg:-mt-5 lg:max-w-[640px] lg:text-left">
        Test a decision before you make it. We project your balance for the next 60 days from your own regular payments and habits.
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
        {/* Inputs */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
            {presets.map((p) => {
              const on = p.type === type
              return (
                <button
                  key={p.type}
                  onClick={() => setType(p.type)}
                  aria-pressed={on}
                  className={`flex w-[150px] shrink-0 flex-col items-start rounded-[14px] p-3 text-left transition lg:w-auto ${on ? 'bg-white ring-[1.5px] ring-brand' : 'bg-[#f4f2f3] hover:bg-[#ece8ea]'}`}
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-[10px] ${on ? 'bg-brand text-white' : 'bg-white text-[#5a5155]'}`}>
                    <Icon name={ICONS[p.type] ?? 'swap'} />
                  </span>
                  <span className={`mt-2.5 block text-[13px] font-semibold ${on ? 'text-brand' : ''}`}>{p.title}</span>
                  <span className="block text-[11px] leading-snug text-[#8a8185]">{p.question}</span>
                </button>
              )
            })}
          </div>

          <div className={`${card} flex flex-col gap-5 p-5`}>
            <p className="text-[15px] font-semibold">{preset.question}</p>
            {preset.fields.map((f) =>
              f.kind === 'category' ? (
                <label key={f.key} className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[#7a7175]">{f.label}</span>
                  <span className="relative flex items-center">
                    <select
                      className="w-full appearance-none rounded-[12px] bg-[#f4f2f3] px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-brand/30"
                      value={String(values[f.key] ?? '')}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    >
                      {spendCats.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <Icon name="chevronDown" className="pointer-events-none absolute right-3 h-4 w-4" />
                  </span>
                </label>
              ) : (
                <label key={f.key} className="block">
                  <span className="mb-1 flex items-baseline justify-between">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-[#7a7175]">{f.label}</span>
                    {f.kind !== 'naira' && <span className="text-[17px] font-semibold text-brand">{shown(f)}</span>}
                  </span>
                  {f.kind === 'naira' && (
                    <span className="mb-2 flex items-center gap-1 border-b border-black/[0.08] pb-1.5 focus-within:border-brand">
                      <span className="text-[24px] font-semibold">₦</span>
                      <input
                        inputMode="numeric"
                        aria-label={`${f.label} in naira`}
                        className="min-w-0 flex-1 bg-transparent text-[24px] font-semibold outline-none"
                        value={Math.round(Number(values[f.key]) / 100).toLocaleString('en-NG')}
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(/[^\d]/g, '')) || 0
                          setValues((v) => ({ ...v, [f.key]: Math.min(n, f.max) * 100 }))
                        }}
                      />
                      <Icon name="pencil" className="h-4 w-4 text-[#8a8185]" />
                    </span>
                  )}
                  <input
                    type="range"
                    className="w-full accent-[var(--color-brand)]"
                    min={f.kind === 'naira' ? f.min * 100 : f.min}
                    max={f.kind === 'naira' ? f.max * 100 : f.max}
                    step={f.kind === 'naira' ? f.step * 100 : f.step}
                    value={Number(values[f.key])}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
                  />
                </label>
              ),
            )}
          </div>
        </section>

        {/* Results */}
        <section className="flex min-w-0 flex-col gap-4" aria-live="polite">
          {error && <p className={`${card} p-4 text-[14px] text-[#c03535]`}>{error}</p>}
          {result && v && !error && (
            <>
              <div className={`rounded-[18px] p-5 ring-1 transition-opacity ${loading ? 'opacity-70' : ''}`} style={{ background: v.bg, color: v.fg, ['--tw-ring-color' as string]: v.ring }}>
                <p className="flex items-center gap-2.5 text-[14px] font-semibold">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white">
                    <Icon name={v.icon} className="h-4 w-4" stroke={2.4} />
                  </span>
                  {v.label}
                </p>
                <p className="mt-3 text-[17px] font-semibold leading-snug text-[#1a1215]">{result.headline}</p>
                <p className="mt-2 text-[13px] text-[#4a4246]">
                  <span className="font-semibold" style={{ color: v.fg }}>What you could do: </span>
                  {result.recommendation}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Stat label="Lowest balance" value={result.result.lowestKobo} sub={`around ${fmtDay(result.result.lowestDate)} · was ${formatNaira(result.baseline.lowestKobo)}`} />
                <Stat label="At month end" value={result.result.monthEndKobo} sub={`was ${formatNaira(result.baseline.monthEndKobo)}`} />
                {result.monthlyProfit && (
                  <div className="col-span-2 lg:col-span-1">
                    <Stat label="Usual monthly profit" value={result.monthlyProfit.scenarioKobo} sub={`was ${formatNaira(result.monthlyProfit.baselineKobo)}`} />
                  </div>
                )}
              </div>

              <div className={`${card} p-5`}>
                <h2 className="mb-1 text-[16px] font-semibold">Projected balance, next 60 days</h2>
                <BalanceChart days={result.days} />
                <details className="mt-3 text-[13px]">
                  <summary className="cursor-pointer font-semibold text-brand">Show as a table</summary>
                  <table className="mt-2 w-full text-left text-[12px] tabular-nums">
                    <thead className="text-[#8a8185]">
                      <tr><th className="py-1">Date</th><th>As things are</th><th>With this decision</th></tr>
                    </thead>
                    <tbody>
                      {result.days.filter((_, i) => i % 7 === 6 || i === result.days.length - 1).map((d) => (
                        <tr key={d.date} className="border-t border-black/[0.05]">
                          <td className="py-1">{fmtDay(d.date)}</td><td>{formatNaira(d.baselineKobo)}</td><td>{formatNaira(d.scenarioKobo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </div>

              <div className="rounded-[18px] bg-[#f4f2f3] p-5 text-[13px]">
                <h2 className="mb-2 font-semibold">How we worked this out</h2>
                <ul className="flex flex-col gap-1.5 text-[#6a6165]">
                  {[...result.assumptions, 'This is an estimate, not a guarantee.'].map((a) => (
                    <li key={a} className="flex gap-2">
                      <Icon name="check" className="mt-0.5 h-3.5 w-3.5 text-brand" stroke={2.4} />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {!result && !error && <p className="text-[14px] text-[#8a8185]">Working it out…</p>}
        </section>
      </div>
    </AppShell>
  )
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className={`${card} h-full p-4`}>
      <p className="text-[12px] text-[#7a7175]">{label}</p>
      <p className={`mt-1 text-[19px] font-semibold ${value < 0 ? 'text-[#d64545]' : ''}`}>{formatNaira(value)}</p>
      <p className="mt-0.5 text-[11px] text-[#8a8185]">{sub}</p>
    </div>
  )
}
