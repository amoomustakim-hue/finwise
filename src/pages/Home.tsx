// Overview (Rejoice's design): magenta header with the balance, the AI insight, money in and out
// this month, the next transaction needing an answer, and recent transactions.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth'
import AppShell, { AccountSheet } from '../components/AppShell'
import AlertsCard from '../components/AlertsCard'
import ReviewCard, { type ReviewItem } from '../components/ReviewCard'
import { useDashboard, useInsights, useTransactions, type DashboardData } from '../app/data'
import { card, Icon, naira, SectionHead, shortDate, Sparkle, TxRow } from '../app/kit'
import { api } from '../lib/api'
import { useMode } from '../mode'
import { ordinal } from '../../shared/text'

type Review = { items: ReviewItem[]; counts: { pending: number; suggested: number } }

const HIDE_KEY = 'fw_hide_balance'
function useHidden() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setHidden((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? '0' : '1')
      } catch {
        /* still toggles for this visit */
      }
      return !h
    })
  return [hidden, toggle] as const
}

const pct = (p: number | null | undefined) => (p == null ? null : `${p >= 0 ? '+' : '−'}${Math.abs(p)}%`)
const DOTS = '₦ • • • • •'

function MoneyCard({ label, kobo, chip, arrow, dark, hidden }: { label: string; kobo: number; chip: string | null; arrow: 'down' | 'up'; dark?: boolean; hidden: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[18px] p-4 text-white lg:p-5 ${dark ? 'bg-[linear-gradient(150deg,#3a3f4b,#232730)]' : 'bg-[linear-gradient(150deg,#b3004f,#7a0035)]'}`}>
      <span aria-hidden="true" className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full border-[5px] border-white/10" />
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#1a1215]">
          <Icon name={arrow} className="h-4 w-4" stroke={2.2} />
        </span>
        {chip && <span className="truncate rounded-full bg-white/20 px-2.5 py-1 text-[11px]">{chip}</span>}
      </div>
      <p className="mt-6 text-[13px] text-white/85">{label}</p>
      <p className="truncate text-[19px] font-semibold tracking-[-0.01em] lg:text-[22px]">{hidden ? DOTS : naira(kobo)}</p>
      <p className="text-[11px] text-white/70">This Month</p>
    </div>
  )
}

/** The expenses chip: how this month's spending sits against the budgets, when there are any. */
function budgetChip(d: DashboardData) {
  const budgeted = d.categories.filter((l) => l.budgetKobo !== null)
  if (!budgeted.length) return null
  if (budgeted.some((l) => l.status === 'over')) return 'Over a limit'
  if (budgeted.some((l) => l.status === 'likely_over' || l.status === 'nearly_used')) return 'Near a limit'
  return 'Safe Limit'
}

export default function Home() {
  const { user } = useAuth()
  const { mode } = useMode()
  const [version, setVersion] = useState(0) // bump to reload everything
  const [review, setReview] = useState<Review | null>(null)
  const [toast, setToast] = useState('')
  const [account, setAccount] = useState(false)
  const [hidden, toggleHidden] = useHidden()

  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  const dash = useDashboard(mode, version)
  const insights = useInsights(mode, version)
  const txs = useTransactions(mode, {}, version)

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

  const d = dash.data
  const b = d?.overview.business ?? null
  const list = txs.data?.transactions ?? null
  const hasDemo = !!list?.some((t) => t.source === 'demo')
  const insight = insights.data?.insights[0]
  const first = user?.name.split(' ')[0] ?? ''
  const balance = d?.overview.balance
  const due = d?.recurring.filter((r) => r.status !== 'paid') ?? []

  const header = (
    <section className="bg-brand-grad px-5 pb-16 pt-[calc(env(safe-area-inset-top)+20px)] text-white lg:rounded-[24px] lg:px-8 lg:pb-20 lg:pt-7">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setAccount(true)} className="flex min-w-0 items-center gap-3 text-left" aria-label="Account and mode">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
            <Icon name="user" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-medium">{mode === 'business' && user?.business_name ? user.business_name : `Hi, ${first}`}</span>
            <span className="flex items-center gap-1 text-[12px] capitalize text-white/75">
              {mode} <Icon name="chevronDown" className="h-3.5 w-3.5" />
            </span>
          </span>
        </button>
        <Link to="/review" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25" aria-label={waiting ? `${waiting} transactions to review` : 'Review transactions'}>
          <Icon name="bell" />
          {waiting > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-brand">{waiting > 9 ? '9+' : waiting}</span>}
        </Link>
      </div>
      <p className="mt-8 text-center text-[14px] text-white/85">{b ? 'Cash in the account' : 'Total Balance'}</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <p className="text-[34px] font-semibold leading-none tracking-[-0.02em] lg:text-[44px]">
          {balance?.asOf ? (hidden ? '₦ • • • • • •' : naira(balance.totalKobo, true)) : d ? '—' : '…'}
        </p>
        <button type="button" onClick={toggleHidden} aria-label={hidden ? 'Show amounts' : 'Hide amounts'} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
          <Icon name={hidden ? 'eyeOff' : 'eye'} />
        </button>
      </div>
      <p className="mt-2 text-center text-[12px] text-white/70">
        {balance?.asOf ? `From your latest statement balance, ${shortDate(balance.asOf)}` : d ? "Your data doesn't include a reliable balance yet" : ''}
      </p>
    </section>
  )

  const insightCard = (
    <Link to="/insights" className="block rounded-[18px] bg-white p-4 shadow-[0_10px_28px_-16px_rgb(79_0_34/0.45)] ring-1 ring-black/[0.04] transition hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <Sparkle className="h-7 w-7 text-brand" />
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-medium leading-tight">Your AI insight</span>
          <span className="block text-[12px] text-[#7a7175]">Personalised financial update</span>
        </span>
        <Icon name="chevron" className="h-5 w-5 text-[#4a4246]" />
      </div>
      <p className="mt-2.5 text-[14px] leading-snug">
        {insight ? insight.body : insights.loading ? 'Reading your month…' : 'Once you have a few weeks of transactions, your personal update shows up here.'}
      </p>
    </Link>
  )

  const overview = d && (
    <section>
      <SectionHead title="Overview" link={{ label: 'View All', to: '/analytics' }} />
      <div className="grid grid-cols-2 gap-3">
        <MoneyCard label={b ? 'Sales' : 'Income'} kobo={b ? b.revenueKobo : d.overview.incomeKobo} chip={b ? pct(b.revenueVsLastMonthPct) : null} arrow="down" hidden={hidden} />
        <MoneyCard label={b ? 'Costs' : 'Expenses'} kobo={b ? b.costsKobo : d.overview.spendKobo} chip={b ? pct(b.costsVsLastMonthPct) : budgetChip(d)} arrow="up" dark hidden={hidden} />
      </div>
      {b && (
        <p className="mt-2 text-[12px] text-[#7a7175]">
          Estimated profit so far: <span className={`font-semibold ${b.profitKobo < 0 ? 'text-[#d64545]' : 'text-[#1a1215]'}`}>{hidden ? DOTS : naira(b.profitKobo)}</span>. {b.caveat}
        </p>
      )}
    </section>
  )

  const reviewBlock = (toast || next) && (
    <section>
      {toast && <p className="mb-2 rounded-[12px] bg-[#e2f3ea] px-3 py-2 text-[13px] text-[#1f6b4f]">{toast}</p>}
      {next && (
        <>
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
            <Link to="/review" className="mt-2 block text-center text-[13px] font-semibold text-brand">
              {[
                review!.counts.pending ? `${review!.counts.pending} need${review!.counts.pending === 1 ? 's' : ''} your answer` : '',
                review!.counts.suggested ? `${review!.counts.suggested} suggestion${review!.counts.suggested === 1 ? '' : 's'} to confirm` : '',
              ]
                .filter(Boolean)
                .join(' · ')}{' '}
              →
            </Link>
          )}
        </>
      )}
    </section>
  )

  const recent = (
    <section>
      <SectionHead title="Recent Transactions" link={list?.length ? { label: 'View All', to: '/transactions' } : undefined} />
      {txs.error && <p className="text-[14px] text-[#d64545]">{txs.error}</p>}
      {!list && !txs.error && <p className="py-3 text-[14px] text-[#8a8185]">Loading transactions…</p>}
      {list && !list.length && (
        <div className={`${card} p-6 text-center`}>
          <p className="font-semibold">No transactions yet</p>
          <p className="mt-1 text-[14px] text-[#7a7175]">Link your bank or upload a statement to get started.</p>
          <Link to={`/import?mode=${mode}`} className="mt-4 inline-block rounded-[12px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white">
            Add transactions
          </Link>
        </div>
      )}
      {list && list.length > 0 && (
        <div className="divide-y divide-black/[0.05]">
          {list.slice(0, 6).map((t) => (
            <TxRow key={t.id} t={t} to={t.category_status === 'pending' ? '/review' : undefined} />
          ))}
        </div>
      )}
    </section>
  )

  const demoTools = hasDemo && (
    <section className="rounded-[18px] bg-[#fff4e0] p-4 text-[13px]">
      <p className="font-semibold text-[#7a4b00]">Demo tools (sample data)</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => simulate('unknown')} className="rounded-[10px] bg-white px-3 py-1.5 font-medium ring-1 ring-[#f2d29b]">
          Simulate unclear transaction
        </button>
        <button onClick={() => simulate('suggested')} className="rounded-[10px] bg-white px-3 py-1.5 font-medium ring-1 ring-[#f2d29b]">
          Simulate known merchant
        </button>
      </div>
    </section>
  )

  const forecast = d && d.forecast.projectedMonthEndBalanceKobo !== null && (
    <Link to="/analytics" className={`${card} block p-4 lg:p-5`}>
      <p className="text-[13px] text-[#7a7175]">Estimated balance at month end</p>
      <p className={`mt-1 text-[22px] font-semibold ${d.forecast.projectedMonthEndBalanceKobo < 0 ? 'text-[#d64545]' : ''}`}>
        {hidden ? DOTS : naira(d.forecast.projectedMonthEndBalanceKobo)}
      </p>
      <p className="mt-1 text-[12px] text-[#8a8185]">An estimate from your usual income and spending, not a guarantee.</p>
    </Link>
  )

  const upcoming = due.length > 0 && (
    <section className={`${card} p-4 lg:p-5`}>
      <h2 className="mb-1 text-[15px] font-semibold">Coming up this month</h2>
      <ul className="divide-y divide-black/[0.05]">
        {due.slice(0, 4).map((r) => (
          <li key={r.key} className="flex justify-between gap-3 py-2.5 text-[13px]">
            <span className="min-w-0">
              <span className="block truncate font-medium">{r.name}</span>
              <span className="block text-[12px] text-[#8a8185]">
                {r.status === 'late' ? `Usually around the ${ordinal(r.typicalDay)}, not seen yet` : r.dueInDays === 0 ? 'Usually today' : `Around the ${ordinal(r.typicalDay)} · in ${r.dueInDays} day(s)`}
              </span>
            </span>
            <span className={`shrink-0 font-semibold ${r.direction === 'credit' ? 'text-[#1f8a5b]' : ''}`}>
              {r.direction === 'credit' ? '+' : '−'}
              {naira(r.typicalAmountKobo)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <AppShell bare>
      {dash.error && <p className="px-5 pt-4 text-[14px] text-[#d64545]">{dash.error}</p>}
      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="min-w-0 lg:col-span-8">
          {header}
          <div className="relative -mt-11 flex flex-col gap-6 px-5 lg:-mt-12">
            {insightCard}
            {reviewBlock}
            {overview}
            {recent}
          </div>
        </div>
        <aside className="mt-6 flex min-w-0 flex-col gap-4 px-5 lg:col-span-4 lg:mt-0 lg:px-0">
          {forecast}
          {upcoming}
          {demoTools}
          <AlertsCard />
        </aside>
      </div>
      {account && <AccountSheet onClose={() => setAccount(false)} />}
    </AppShell>
  )
}
