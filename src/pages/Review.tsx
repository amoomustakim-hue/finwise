// Review: everything waiting for the user's answer or confirmation, in two tabs.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import AppShell from '../components/AppShell'
import ReviewCard, { type ReviewItem } from '../components/ReviewCard'
import { card, Icon } from '../app/kit'
import { api } from '../lib/api'
import { useMode } from '../mode'

type Tab = 'answer' | 'confirm'

export default function Review() {
  const { mode } = useMode()
  const [items, setItems] = useState<ReviewItem[] | null>(null)
  const [bulk, setBulk] = useState(0)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<Tab | null>(null)

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
  // Open on whichever tab has something in it.
  const shown: Tab = tab ?? (waiting.length || !toConfirm.length ? 'answer' : 'confirm')
  const list = shown === 'answer' ? waiting : toConfirm.slice(0, 30)
  const done = (m: string) => {
    setToast(m)
    load()
  }

  const tabBtn = (t: Tab, label: string, n: number) => (
    <button
      key={t}
      type="button"
      role="tab"
      aria-selected={shown === t}
      onClick={() => setTab(t)}
      className={`flex items-center justify-center gap-2 rounded-[9px] py-2.5 text-[14px] transition ${shown === t ? 'bg-white font-semibold text-brand shadow-[0_2px_6px_rgb(0_0_0/0.08)]' : 'text-[#5a5155]'}`}
    >
      {label}
      <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${shown === t ? 'bg-brand text-white' : 'bg-black/[0.06]'}`}>{n}</span>
    </button>
  )

  return (
    <AppShell title="Review">
      <div className="mx-auto max-w-[900px] lg:mx-0">
        <p className="-mt-3 mb-5 text-center text-[13px] text-[#7a7175] lg:-mt-5 lg:text-left">
          Tell FinWise what each payment was for. Answers update your budgets straight away.
        </p>
        {toast && (
          <p className="mb-4 flex items-center gap-2 rounded-[12px] bg-[#e2f3ea] px-3 py-2.5 text-[13px] text-[#1f6b4f]">
            <Icon name="checkCircle" className="h-4 w-4" /> {toast}
          </p>
        )}
        {!items && <p className="text-[14px] text-[#8a8185]">Loading…</p>}

        {items && !items.length && (
          <div className={`${card} flex flex-col items-center px-6 py-10 text-center`}>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e2f3ea] text-[#1f8a5b]">
              <Icon name="check" className="h-7 w-7" stroke={2.4} />
            </span>
            <p className="mt-4 text-[17px] font-semibold">All caught up</p>
            <p className="mt-1 max-w-[320px] text-[14px] text-[#7a7175]">Every transaction has a category. New ones show up here as they arrive.</p>
            <Link to="/transactions" className="mt-5 text-[14px] font-semibold text-brand">See your activity</Link>
          </div>
        )}

        {items && items.length > 0 && (
          <>
            <div className="grid grid-cols-2 rounded-[12px] bg-[#f4f2f3] p-1" role="tablist" aria-label="Review">
              {tabBtn('answer', 'To answer', waiting.length)}
              {tabBtn('confirm', 'To confirm', toConfirm.length)}
            </div>

            {shown === 'confirm' && bulk > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] bg-blush p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand">
                  <Icon name="checkCircle" />
                </span>
                <p className="min-w-[150px] flex-1 text-[13px] text-[#4a4246]">
                  <span className="block font-semibold text-[#1a1215]">{bulk} confident suggestions</span>
                  Merchants FinWise already knows well.
                </p>
                <button onClick={confirmAll} className="w-full shrink-0 rounded-[10px] sm:w-auto bg-brand px-3.5 py-2 text-[13px] font-semibold text-white">
                  Confirm all
                </button>
              </div>
            )}

            {list.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-[#8a8185]">{shown === 'answer' ? 'Nothing waiting for an answer.' : 'No suggestions to confirm.'}</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {list.map((i) => (
                  <ReviewCard key={i.id} item={i} onDone={done} />
                ))}
              </div>
            )}
            <p className="mt-6 text-center text-[12px] text-[#9a9195]">Unanswered transactions stay in your activity but aren't counted in a category budget.</p>
          </>
        )}
      </div>
    </AppShell>
  )
}
