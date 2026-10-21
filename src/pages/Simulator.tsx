// Decision Simulator: pick a decision, adjust it, see how your projected balance changes.
// All maths happens on the server (deterministic); this page only collects inputs and shows results.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { categoriesFor } from '../../shared/categories'
import AppShell from '../components/AppShell'
import BalanceChart from '../components/BalanceChart'
import { api, type Mode } from '../lib/api'
import { formatNaira } from '../lib/format'
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

const VERDICT = {
  ok: { label: 'Looks manageable', icon: '✓', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  tight: { label: 'Possible, but tight', icon: '!', cls: 'bg-amber-50 text-amber-900 ring-amber-200' },
  shortfall: { label: 'You could run short', icon: '✕', cls: 'bg-red-50 text-red-800 ring-red-200' },
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
    setValues(p.defaults)
  }, [mode, type])

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

  return (
    <AppShell title="Decision Simulator">
      <p className="mb-5 max-w-3xl text-sm text-slate-600">
        Test a decision before you make it. We project your balance day by day for the next 60 days, using your own
        regular payments and spending habits, then show what changes.
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Inputs */}
        <section className="flex flex-col gap-4 lg:col-span-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {presets.map((p) => (
              <button
                key={p.type}
                onClick={() => setType(p.type)}
                aria-pressed={p.type === type}
                className={`rounded-xl bg-white p-3 text-left ring-1 transition ${p.type === type ? 'ring-2 ring-brand' : 'ring-slate-200 hover:ring-slate-300'}`}
              >
                <span className="block text-sm font-semibold">{p.title}</span>
                <span className="block text-xs text-slate-500">{p.question}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            {preset.fields.map((f) =>
              f.kind === 'category' ? (
                <label key={f.key} className="block text-sm">
                  <span className="mb-1 block font-medium">{f.label}</span>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  >
                    {spendCats.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              ) : (
                <label key={f.key} className="block text-sm">
                  <span className="mb-1 flex justify-between font-medium">
                    {f.label}
                    <span className="text-brand">
                      {f.kind === 'naira' ? formatNaira(Number(values[f.key])) : f.kind === 'pct' ? `${values[f.key]}%` : `${values[f.key]} day${values[f.key] === 1 ? '' : 's'}`}
                    </span>
                  </span>
                  <input
                    type="range"
                    className="w-full accent-[var(--color-brand)]"
                    min={f.kind === 'naira' ? f.min * 100 : f.min}
                    max={f.kind === 'naira' ? f.max * 100 : f.max}
                    step={f.kind === 'naira' ? f.step * 100 : f.step}
                    value={Number(values[f.key])}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
                  />
                  {f.kind === 'naira' && (
                    <input
                      inputMode="numeric"
                      aria-label={`${f.label} in naira`}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                      value={Math.round(Number(values[f.key]) / 100)}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/[^\d]/g, '')) || 0
                        setValues((v) => ({ ...v, [f.key]: Math.min(n, f.max) * 100 }))
                      }}
                    />
                  )}
                </label>
              ),
            )}
          </div>
        </section>

        {/* Results */}
        <section className="flex flex-col gap-4 lg:col-span-8" aria-live="polite">
          {error && <p className="rounded-2xl bg-white p-4 text-red-700 ring-1 ring-red-200">{error}</p>}
          {result && !error && (
            <>
              <div className={`rounded-2xl p-4 ring-1 ${VERDICT[result.verdict].cls} ${loading ? 'opacity-70' : ''}`}>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs ring-1 ring-current">{VERDICT[result.verdict].icon}</span>
                  {VERDICT[result.verdict].label}
                </p>
                <p className="mt-1 text-base">{result.headline}</p>
                <p className="mt-2 text-sm"><span className="font-semibold">What you could do: </span>{result.recommendation}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs text-slate-500">Lowest balance</p>
                  <p className={`mt-1 text-lg font-semibold ${result.result.lowestKobo < 0 ? 'text-red-700' : ''}`}>{formatNaira(result.result.lowestKobo)}</p>
                  <p className="text-xs text-slate-500">around {fmtDay(result.result.lowestDate)} · was {formatNaira(result.baseline.lowestKobo)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs text-slate-500">At month end</p>
                  <p className={`mt-1 text-lg font-semibold ${result.result.monthEndKobo < 0 ? 'text-red-700' : ''}`}>{formatNaira(result.result.monthEndKobo)}</p>
                  <p className="text-xs text-slate-500">was {formatNaira(result.baseline.monthEndKobo)}</p>
                </div>
                {result.monthlyProfit && (
                  <div className="col-span-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 lg:col-span-1">
                    <p className="text-xs text-slate-500">Usual monthly profit</p>
                    <p className="mt-1 text-lg font-semibold">{formatNaira(result.monthlyProfit.scenarioKobo)}</p>
                    <p className="text-xs text-slate-500">was {formatNaira(result.monthlyProfit.baselineKobo)}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <h2 className="mb-1 font-semibold">Projected balance, next 60 days</h2>
                <BalanceChart days={result.days} />
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-brand">Show as a table</summary>
                  <table className="mt-2 w-full text-left text-xs tabular-nums">
                    <thead className="text-slate-500">
                      <tr><th className="py-1">Date</th><th>As things are</th><th>With this decision</th></tr>
                    </thead>
                    <tbody>
                      {result.days.filter((_, i) => i % 7 === 6 || i === result.days.length - 1).map((d) => (
                        <tr key={d.date} className="border-t border-slate-100">
                          <td className="py-1">{fmtDay(d.date)}</td><td>{formatNaira(d.baselineKobo)}</td><td>{formatNaira(d.scenarioKobo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </div>

              <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200">
                <h2 className="mb-1 font-semibold">How we worked this out</h2>
                <ul className="list-disc pl-5 text-slate-600">
                  {result.assumptions.map((a) => <li key={a}>{a}</li>)}
                  <li>This is an estimate, not a guarantee.</li>
                </ul>
              </div>
            </>
          )}
          {!result && !error && <p className="text-slate-500">Working it out…</p>}
        </section>
      </div>
    </AppShell>
  )
}
