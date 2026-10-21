// One transaction that needs the user: either "what was this for?" (pending) or
// "Is this Food?" (a suggestion to confirm). Answering updates the budget immediately.
import { useState } from 'react'
import { api } from '../lib/api'
import { formatDate, formatNaira } from '../lib/format'

export type ReviewItem = {
  id: string
  occurred_at: string
  amount_kobo: number
  direction: 'debit' | 'credit'
  narration: string
  category: string | null
  category_status: 'pending' | 'suggested'
  category_source: string | null
  question: string
  options: string[]
  source: string
}

const QUICK = 6 // categories shown before "More…"

export default function ReviewCard({ item, headline, onDone }: { item: ReviewItem; headline?: string; onDone: (msg: string) => void }) {
  const [picking, setPicking] = useState(item.category_status === 'pending')
  const [showAll, setShowAll] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function answer(category: string) {
    setBusy(true)
    setError('')
    try {
      const r = await api<{ alsoUpdated: number }>('/review', { method: 'POST', body: { id: item.id, category, remember } })
      onDone(r.alsoUpdated > 0 ? `Saved as ${category}, and ${r.alsoUpdated} similar transaction${r.alsoUpdated === 1 ? '' : 's'} too.` : `Saved as ${category}.`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const options = showAll ? item.options : item.options.slice(0, QUICK)
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand/30">
      {headline && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">{headline}</p>}
      <p className="text-sm text-slate-600">
        <span className={`font-semibold ${item.direction === 'credit' ? 'text-emerald-700' : 'text-slate-900'}`}>
          {formatNaira(item.amount_kobo)} {item.direction === 'credit' ? 'received' : 'debited'}
        </span>{' '}
        · {formatDate(item.occurred_at)}
      </p>
      <p className="mt-1 truncate text-xs text-slate-500">{item.narration}</p>
      <p className="mt-3 font-semibold">{item.question}</p>
      {item.category_source === 'ai' && !picking && (
        <p className="mt-1 text-xs text-slate-500">Suggested by AI from the description. Please check.</p>
      )}

      {!picking ? (
        <div className="mt-3 flex gap-2">
          <button disabled={busy} onClick={() => answer(item.category!)} className="flex-1 rounded-xl bg-brand py-2 text-sm font-semibold text-white">
            Yes, {item.category}
          </button>
          <button disabled={busy} onClick={() => setPicking(true)} className="flex-1 rounded-xl py-2 text-sm font-semibold ring-1 ring-slate-300">
            Change category
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((c) => (
              <button
                key={c}
                disabled={busy}
                onClick={() => answer(c)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-brand hover:text-white"
              >
                {c}
              </button>
            ))}
            {!showAll && item.options.length > QUICK && (
              <button onClick={() => setShowAll(true)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand">
                More…
              </button>
            )}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Use this for similar transactions in future
          </label>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </article>
  )
}
