// Set this month's category budgets. Pre-filled from the last 3 months' average when none are set.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, ErrorText, Screen } from '../components/ui'
import { api, type Mode } from '../lib/api'
import { formatNaira } from '../lib/format'

type Item = { category: string; amountKobo: number | null; suggestedKobo: number | null; avgMonthlyKobo: number; spentKobo: number }

export default function Budgets() {
  const [params] = useSearchParams()
  const mode = (params.get('mode') === 'business' ? 'business' : 'personal') as Mode
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[] | null>(null)
  const [hasBudgets, setHasBudgets] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({}) // naira, as typed
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ items: Item[]; hasBudgets: boolean }>(`/budgets?mode=${mode}`).then((r) => {
      setItems(r.items)
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
      const out = Object.entries(values).map(([category, v]) => ({ category, amountKobo: Math.round((Number(v.replace(/[^\d.]/g, '')) || 0) * 100) }))
      await api('/budgets', { method: 'PUT', body: { mode, items: out } })
      navigate('/home')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const total = Object.values(values).reduce((n, v) => n + (Number(v.replace(/[^\d.]/g, '')) || 0), 0)

  return (
    <Screen>
      <Link to="/home" className="mb-4 text-sm text-slate-500">← Back</Link>
      <h1 className="text-2xl font-bold">{mode === 'business' ? 'Operating budget' : 'Monthly budget'}</h1>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        {hasBudgets
          ? 'Change any amount. Leave a category empty for no budget.'
          : 'We filled these in from your average over the last 3 months. Adjust them to fit your plan.'}{' '}
        Budgets are plans inside FinWise; they don't move or block money in your bank.
      </p>
      {!items && <p className="text-slate-500">Loading…</p>}
      {items && (
        <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-200">
          {items.map((i) => (
            <li key={i.category} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{i.category}</p>
                <p className="text-xs text-slate-500">
                  {i.avgMonthlyKobo ? `Usually ${formatNaira(i.avgMonthlyKobo)} a month` : 'No recent spending'}
                  {i.spentKobo ? ` · ${formatNaira(i.spentKobo)} so far` : ''}
                </p>
              </div>
              <label className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 focus-within:border-brand">
                <span className="text-slate-500">₦</span>
                <input
                  inputMode="numeric"
                  aria-label={`${i.category} budget`}
                  className="w-24 text-right outline-none"
                  value={values[i.category] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [i.category]: e.target.value }))}
                  placeholder="0"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-slate-600">Total planned: <span className="font-semibold">{formatNaira(total * 100)}</span></p>
      <ErrorText>{error}</ErrorText>
      <Button className="mt-3" onClick={save} disabled={busy || !items}>{busy ? 'Saving…' : 'Save budgets'}</Button>
    </Screen>
  )
}
