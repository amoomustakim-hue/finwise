// Home: Personal/Business switch, the newest transaction needing an answer, and the transaction list.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth'
import ReviewCard, { type ReviewItem } from '../components/ReviewCard'
import TransactionList from '../components/TransactionList'
import { Screen } from '../components/ui'
import { api, type Mode } from '../lib/api'

const MODE_KEY = 'fw_mode'

function rememberedMode(): Mode | null {
  try {
    const v = localStorage.getItem(MODE_KEY)
    return v === 'personal' || v === 'business' ? v : null
  } catch {
    return null
  }
}

type Review = { items: ReviewItem[]; counts: { pending: number; suggested: number } }

export default function Home() {
  const { user, signOut } = useAuth()
  const both = !!user?.uses_personal && !!user?.uses_business
  const fallback: Mode = user?.uses_personal ? 'personal' : 'business'
  const [mode, setMode] = useState<Mode>(() => (both ? (rememberedMode() ?? fallback) : fallback))
  const [version, setVersion] = useState(0) // bump to reload everything
  const [review, setReview] = useState<Review | null>(null)
  const [hasDemo, setHasDemo] = useState(false)
  const [toast, setToast] = useState('')

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    api<Review>(`/review?mode=${mode}`).then(setReview).catch(() => setReview(null))
  }, [mode, version])

  // Once per visit: pull new transactions from linked banks (Mono), then let the AI suggest
  // categories for unknown merchants, then refresh if anything changed.
  useEffect(() => {
    ;(async () => {
      let changed = false
      try {
        const m = await api<{ results?: { imported?: number }[] }>('/mono/sync', { method: 'POST', body: {} })
        changed = (m.results ?? []).some((x) => (x.imported ?? 0) > 0)
      } catch {
        /* offline or Mono unavailable: carry on with what we have */
      }
      try {
        const c = await api<{ suggested: number }>('/categorise', { method: 'POST', body: {} })
        changed = changed || c.suggested > 0
      } catch {
        /* AI unavailable: rules already ran at import time */
      }
      if (changed) refresh()
    })()
  }, [refresh])

  function switchTo(m: Mode) {
    setMode(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      /* storage unavailable: switching still works for this visit */
    }
  }

  async function simulate(type: 'unknown' | 'suggested') {
    await api('/simulate', { method: 'POST', body: { mode, type } })
    setToast('')
    refresh()
  }

  // Show the newest transaction if it arrived in the last 3 days (the "just detected" case);
  // otherwise the oldest-standing question first.
  const isRecent = (i: ReviewItem) => Date.now() - new Date(i.occurred_at).getTime() < 3 * 86400000
  const newest = review?.items.reduce<ReviewItem | undefined>((a, b) => (!a || b.occurred_at > a.occurred_at ? b : a), undefined)
  const next =
    (newest && isRecent(newest) ? newest : undefined) ??
    review?.items.find((i) => i.category_status === 'pending') ??
    review?.items[0]
  const waiting = (review?.counts.pending ?? 0) + (review?.counts.suggested ?? 0)

  return (
    <Screen>
      <header className="mb-6 flex items-center justify-between">
        <span className="text-xl font-bold text-brand">FinWise</span>
        <button onClick={signOut} className="text-sm text-slate-500 underline">
          Sign out
        </button>
      </header>

      {both && (
        <div role="tablist" className="mb-6 grid grid-cols-2 rounded-xl bg-slate-200 p-1">
          {(['personal', 'business'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchTo(m)}
              className={`rounded-lg py-2 text-sm font-semibold capitalize ${mode === m ? 'bg-white shadow' : 'text-slate-600'}`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          {mode === 'business' ? user?.business_name : `Hi ${user?.name.split(' ')[0]}`}
        </h1>
        <Link to={`/import?mode=${mode}`} className="shrink-0 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
          + Add transactions
        </Link>
      </div>

      {toast && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{toast}</p>}

      {next && (
        <div className="mb-6">
          <ReviewCard
            key={next.id}
            item={next}
            headline={
              isRecent(next) ? 'New transaction detected' : next.category_status === 'suggested' ? 'Please confirm' : 'Needs your answer'
            }
            onDone={(msg) => {
              setToast(msg)
              refresh()
            }}
          />
          {waiting > 1 && (
            <Link to={`/review?mode=${mode}`} className="mt-2 block text-center text-sm font-semibold text-brand">
              {waiting - 1} more to review →
            </Link>
          )}
        </div>
      )}

      <TransactionList mode={mode} version={version} onLoaded={setHasDemo} />

      {hasDemo && (
        <section className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
          <p className="font-semibold text-amber-900">Demo tools (sample data)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => simulate('unknown')} className="rounded-lg bg-white px-3 py-1.5 font-medium ring-1 ring-amber-300">
              Simulate unclear transaction
            </button>
            <button onClick={() => simulate('suggested')} className="rounded-lg bg-white px-3 py-1.5 font-medium ring-1 ring-amber-300">
              Simulate known merchant
            </button>
          </div>
        </section>
      )}
    </Screen>
  )
}
