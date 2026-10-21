// Pending transactions list: everything waiting for the user's answer or confirmation.
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import ReviewCard, { type ReviewItem } from '../components/ReviewCard'
import { Screen } from '../components/ui'
import { api, type Mode } from '../lib/api'

export default function Review() {
  const [params] = useSearchParams()
  const mode = (params.get('mode') === 'business' ? 'business' : 'personal') as Mode
  const [items, setItems] = useState<ReviewItem[] | null>(null)
  const [bulk, setBulk] = useState(0)
  const [toast, setToast] = useState('')

  const load = useCallback(() => {
    api<{ items: ReviewItem[]; counts: { bulk_confirmable: number } }>(`/review?mode=${mode}`).then((r) => {
      setItems(r.items)
      setBulk(r.counts.bulk_confirmable)
    })
  }, [mode])
  useEffect(load, [load])

  async function confirmAll() {
    const r = await api<{ confirmed: number }>('/review', { method: 'POST', body: { confirmAll: true, mode } })
    setToast(`Confirmed ${r.confirmed} transactions.`)
    load()
  }

  const waiting = items?.filter((i) => i.category_status === 'pending') ?? []
  const toConfirm = items?.filter((i) => i.category_status === 'suggested') ?? []

  return (
    <Screen>
      <Link to="/home" className="mb-4 text-sm text-slate-500">← Back</Link>
      <h1 className="text-2xl font-bold">Transactions to review</h1>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        Answers update your budgets straight away. Unanswered transactions stay visible but aren't counted in a category budget.
      </p>
      {toast && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{toast}</p>}
      {!items && <p className="text-slate-500">Loading…</p>}
      {items && !items.length && <p className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">All caught up 🎉</p>}

      {waiting.length > 0 && <h2 className="mb-2 mt-2 font-semibold">Awaiting your answer ({waiting.length})</h2>}
      <div className="flex flex-col gap-3">
        {waiting.map((i) => <ReviewCard key={i.id} item={i} onDone={(m) => { setToast(m); load() }} />)}
      </div>

      {toConfirm.length > 0 && <h2 className="mb-2 mt-6 font-semibold">Please confirm ({toConfirm.length})</h2>}
      {bulk > 0 && (
        <button onClick={confirmAll} className="mb-3 w-full rounded-xl bg-brand/10 py-2 text-sm font-semibold text-brand">
          Confirm all {bulk} confident suggestions
        </button>
      )}
      <div className="flex flex-col gap-3">
        {toConfirm.slice(0, 30).map((i) => <ReviewCard key={i.id} item={i} onDone={(m) => { setToast(m); load() }} />)}
      </div>
    </Screen>
  )
}
