// Home: the dashboard for the current mode, the newest transaction needing an answer, and the list.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth'
import AppShell from '../components/AppShell'
import Dashboard from '../components/Dashboard'
import Insights from '../components/Insights'
import ReviewCard, { type ReviewItem } from '../components/ReviewCard'
import TransactionList from '../components/TransactionList'
import { api } from '../lib/api'
import { useMode } from '../mode'

type Review = { items: ReviewItem[]; counts: { pending: number; suggested: number } }

export default function Home() {
  const { user } = useAuth()
  const { mode } = useMode()
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

  const reviewBlock = (
    <>
      {toast && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{toast}</p>}
      {next && (
        <div>
          <ReviewCard
            key={next.id}
            item={next}
            headline={isRecent(next) ? 'New transaction detected' : next.category_status === 'suggested' ? 'Please confirm' : 'Needs your answer'}
            onDone={(msg) => {
              setToast(msg)
              refresh()
            }}
          />
          {waiting > 1 && (
            <Link to="/review" className="mt-2 block text-center text-sm font-semibold text-brand">
              {[
                review!.counts.pending ? `${review!.counts.pending} need${review!.counts.pending === 1 ? 's' : ''} your answer` : '',
                review!.counts.suggested ? `${review!.counts.suggested} suggestion${review!.counts.suggested === 1 ? '' : 's'} to confirm` : '',
              ]
                .filter(Boolean)
                .join(' · ')}{' '}
              →
            </Link>
          )}
        </div>
      )}
    </>
  )

  const listBlock = (
    <>
      <TransactionList mode={mode} version={version} onLoaded={setHasDemo} limit={10} seeAllLink />
      {hasDemo && (
        <section className="rounded-2xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
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
    </>
  )

  return (
    <AppShell
      title={mode === 'business' ? user?.business_name : `Hi ${user?.name.split(' ')[0]}`}
      actions={
        <Link to="/import" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
          + Add transactions
        </Link>
      }
    >
      <Dashboard mode={mode} version={version} beforeMain={reviewBlock} insights={<Insights mode={mode} version={version} />} afterMain={listBlock} />
    </AppShell>
  )
}
