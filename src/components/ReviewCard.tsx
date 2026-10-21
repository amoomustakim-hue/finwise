// One transaction that needs the user: either "what was this for?" (pending) or
// "Is this Food?" (a suggestion to confirm). Answering updates the budget immediately.
import { useState } from 'react'
import { api } from '../lib/api'
import { categoryStyle, CategoryIcon, Icon, merchant, naira, shortDate, Sparkle } from '../app/kit'

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

const QUICK = 6 // categories shown before "More"

export default function ReviewCard({ item, headline, onDone }: { item: ReviewItem; headline?: string; onDone: (msg: string) => void }) {
  const [picking, setPicking] = useState(item.category_status === 'pending')
  const [showAll, setShowAll] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const credit = item.direction === 'credit'

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
    <article className="rounded-[18px] bg-white p-4 shadow-[0_8px_24px_-18px_rgb(79_0_34/0.4)] ring-1 ring-black/[0.06] lg:p-5">
      {headline && (
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {headline}
        </p>
      )}
      <div className="flex items-center gap-3.5">
        <CategoryIcon category={picking ? null : item.category} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{merchant(item.narration)}</p>
          <p className="text-[12px] text-[#8a8185]">
            {shortDate(item.occurred_at)} · {credit ? 'received' : 'paid'}
          </p>
        </div>
        <p className={`shrink-0 text-[16px] font-semibold ${credit ? 'text-[#1f8a5b]' : 'text-[#e0533a]'}`}>
          {credit ? '+' : '−'}
          {naira(item.amount_kobo)}
        </p>
      </div>

      <p className="mt-4 text-[15px] font-semibold">{item.question}</p>
      {item.category_source === 'ai' && !picking && (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-[#8a8185]">
          <Sparkle className="h-3.5 w-3.5 text-brand" /> Suggested by AI from the description. Please check.
        </p>
      )}

      {!picking ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => answer(item.category!)} className="flex items-center justify-center gap-1.5 rounded-[12px] bg-brand py-2.5 text-[14px] font-semibold text-white disabled:opacity-60">
            <Icon name="check" className="h-4 w-4" stroke={2.4} /> Yes, {item.category}
          </button>
          <button disabled={busy} onClick={() => setPicking(true)} className="rounded-[12px] bg-[#f4f2f3] py-2.5 text-[14px] font-semibold text-[#2a2226] disabled:opacity-60">
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((c) => {
              const s = categoryStyle(c)
              return (
                <button
                  key={c}
                  disabled={busy}
                  onClick={() => answer(c)}
                  className="flex items-center gap-1.5 rounded-full bg-[#f4f2f3] py-1.5 pl-1.5 pr-3 text-[13px] font-medium transition hover:bg-blush hover:text-brand disabled:opacity-60"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: s.bg, color: s.fg }}>
                    <Icon name={s.icon} className="h-3.5 w-3.5" />
                  </span>
                  {c}
                </button>
              )
            })}
            {!showAll && item.options.length > QUICK && (
              <button onClick={() => setShowAll(true)} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand">
                More
              </button>
            )}
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12px] text-[#6a6165]">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
            Use this for similar transactions in future
          </label>
        </>
      )}
      {error && <p className="mt-2 text-[13px] text-[#d64545]">{error}</p>}
    </article>
  )
}
