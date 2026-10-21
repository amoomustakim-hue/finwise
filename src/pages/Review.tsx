// Pending transactions list: everything waiting for the user's answer or confirmation.
import { useCallback, useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import ReviewCard, { type ReviewItem } from '../components/ReviewCard'
import { api } from '../lib/api'
import { useMode } from '../mode'

export default function Review() {
  const { mode } = useMode()
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
    <AppShell title="Transactions to review">
      <p className="mb-4 max-w-3xl text-sm text-[#6a6165]">
        Answers update your budgets straight away. Unanswered transactions stay visible but aren't counted in a category budget.
      </p>
      {toast && <p className="mb-3 rounded-lg bg-[#e2f3ea] px-3 py-2 text-sm text-[#1f6b4f]">{toast}</p>}
      {!items && <p className="text-[#8a8185]">Loading…</p>}
      {items && !items.length && <p className="rounded-[18px] bg-white p-6 text-center ring-1 ring-black/[0.06]">All caught up 🎉</p>}

      {waiting.length > 0 && <h2 className="mb-2 mt-2 font-semibold">Awaiting your answer ({waiting.length})</h2>}
      <div className="grid gap-3 xl:grid-cols-2">
        {waiting.map((i) => <ReviewCard key={i.id} item={i} onDone={(m) => { setToast(m); load() }} />)}
      </div>

      {toConfirm.length > 0 && <h2 className="mb-2 mt-6 font-semibold">Please confirm ({toConfirm.length})</h2>}
      {bulk > 0 && (
        <button onClick={confirmAll} className="mb-3 w-full rounded-[12px] bg-brand/10 lg:w-auto lg:px-6 py-2 text-sm font-semibold text-brand">
          Confirm all {bulk} confident suggestions
        </button>
      )}
      <div className="grid gap-3 xl:grid-cols-2">
        {toConfirm.slice(0, 30).map((i) => <ReviewCard key={i.id} item={i} onDone={(m) => { setToast(m); load() }} />)}
      </div>
    </AppShell>
  )
}
