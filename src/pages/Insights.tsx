// AI Insight (Rejoice's design): a monthly summary, "Ask FinWise" (answered by the Decision
// Simulator), insight cards with their evidence and an action, and a suggested budget to set.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import AppShell from '../components/AppShell'
import { useDashboard, useInsights, type DashboardData, type Insight } from '../app/data'
import { card, Icon, monthLabel, naira, Sparkle, type IconName } from '../app/kit'
import type { Mode } from '../lib/api'
import { useMode } from '../mode'

type Tag = { tag: string; fg: string; bg: string; icon: IconName }
const TAGS: [RegExp, Tag][] = [
  [/^budget-/, { tag: 'Budget', fg: '#c2185b', bg: '#fde6ef', icon: 'target' }],
  [/^trend-/, { tag: 'Spending change', fg: '#e0533a', bg: '#ffe8e1', icon: 'trend' }],
  [/^subscriptions/, { tag: 'Subscriptions', fg: '#3a6fd8', bg: '#e6eefd', icon: 'repeat' }],
  [/^month-end/, { tag: 'Heads up', fg: '#d64545', bg: '#fde4e4', icon: 'alert' }],
  [/^best-day/, { tag: 'Sales pattern', fg: '#1f8a5b', bg: '#e2f3ea', icon: 'calendar' }],
  [/^restock|^supplier/, { tag: 'Supplier costs', fg: '#d9800f', bg: '#fff1dc', icon: 'box' }],
  [/^owner-draw/, { tag: "Owner's pay", fg: '#6b4fd6', bg: '#ece8fd', icon: 'coins' }],
  [/^personal-in-business/, { tag: 'Mixing money', fg: '#c98a00', bg: '#fff3d6', icon: 'swap' }],
]
const PATTERN: Tag = { tag: 'Spending pattern', fg: '#d9800f', bg: '#fff1dc', icon: 'cart' }
const tagFor = (id: string) => TAGS.find(([re]) => re.test(id))?.[1] ?? PATTERN

/** Questions people can tap; each opens the simulator on the matching scenario. */
const ASK: Record<Mode, { q: string; to: string }[]> = {
  personal: [
    { q: 'Can I afford a ₦50,000 purchase this week?', to: '/simulator?scenario=purchase&amount=50000' },
    { q: 'What if my salary is two weeks late?', to: '/simulator?scenario=salary_delay' },
    { q: 'What if I save ₦20,000 every month?', to: '/simulator?scenario=save_monthly&amount=20000' },
    { q: 'What if my rent goes up?', to: '/simulator?scenario=expense_change' },
  ],
  business: [
    { q: 'Can I afford a new staff member?', to: '/simulator?scenario=hire' },
    { q: 'What if sales drop by 20%?', to: '/simulator?scenario=revenue_drop' },
    { q: 'What if a customer pays late?', to: '/simulator?scenario=late_payment' },
    { q: 'What if my supplier raises prices?', to: '/simulator?scenario=supplier_increase' },
  ],
}

/** Turn a typed question into a simulator scenario, picking out an amount like "50k" or "₦120,000". */
function route(text: string, mode: Mode) {
  const t = text.toLowerCase()
  const m = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|m|million|thousand)?\b/)
  const n = m ? Number(m[1].replace(/,/g, '')) * (m[2]?.startsWith('m') ? 1_000_000 : m[2] === 'k' || m[2] === 'thousand' ? 1_000 : 1) : 0
  const amount = n >= 100 ? `&amount=${Math.round(n)}` : ''
  const pick =
    mode === 'business'
      ? /hire|staff|employ|worker/.test(t)
        ? 'hire'
        : /sales|revenue/.test(t) && /drop|fall|slow|low/.test(t)
          ? 'revenue_drop'
          : /customer|client|owe|pays? late/.test(t)
            ? 'late_payment'
            : /supplier|stock|restock|raw/.test(t)
              ? 'supplier_increase'
              : 'purchase'
      : /salary|paid late|pay ?day|delay/.test(t)
        ? 'salary_delay'
        : /save|saving/.test(t)
          ? 'save_monthly'
          : /rent|bill|rise|go(es)? up|increase/.test(t)
            ? 'expense_change'
            : 'purchase'
  return `/simulator?scenario=${pick}${pick === 'purchase' || pick === 'save_monthly' || pick === 'hire' || pick === 'late_payment' ? amount : ''}`
}

function summary(d: DashboardData) {
  const spent = d.categories.filter((l) => l.spentKobo > 0).sort((a, b) => b.spentKobo - a.spentKobo)
  const total = d.overview.business?.costsKobo ?? d.overview.spendKobo
  const month = monthLabel(d.period.month)
  const word = d.overview.business ? 'costs' : 'spending'
  if (!spent.length || !total) return { text: `No ${word} recorded in ${month} yet. As transactions come in, this summary fills in.`, top: null, total }
  const share = (n: number) => Math.round((n / total) * 100)
  const [a, b] = spent
  const text = b
    ? `Your ${word} is concentrated in ${a.category} and ${b.category}. Together they make up ${share(a.spentKobo + b.spentKobo)}% of your ${month} ${d.overview.business ? 'costs' : 'expenses'}.`
    : `${a.category} makes up ${share(a.spentKobo)}% of your ${month} ${d.overview.business ? 'costs' : 'expenses'}.`
  return { text, top: a.category, total }
}

function InsightCard({ i }: { i: Insight }) {
  const [open, setOpen] = useState(false)
  const t = tagFor(i.id)
  return (
    <article className="rounded-[16px] border border-black/[0.06] bg-white p-4 shadow-[0_6px_18px_-14px_rgb(0_0_0/0.35)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: t.bg, color: t.fg }}>
          <Icon name={t.icon} />
        </span>
        <span className="min-w-0">
          <span className="inline-block rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
            {t.tag}
          </span>
          <span className="mt-1 block text-[15px] font-semibold leading-snug">{i.title}</span>
        </span>
      </div>
      <p className="mt-2.5 text-[14px] leading-snug text-[#4a4246]">{i.body}</p>
      {open && i.evidence.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1 rounded-[12px] bg-[#fafafa] p-3 text-[12px] text-[#6a6165]">
          {i.evidence.map((e) => (
            <li key={e} className="flex gap-2">
              <Icon name="check" className="mt-0.5 h-3.5 w-3.5 text-brand" stroke={2.4} />
              {e}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/[0.05] pt-3">
        {i.evidence.length > 0 ? (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-[12px] font-medium text-[#8a8185] hover:text-[#1a1215]" aria-expanded={open}>
            {open ? 'Hide why' : 'Why?'}
          </button>
        ) : (
          <span />
        )}
        <Link to={i.action.to} className="flex items-center gap-1 text-[13px] font-semibold text-brand">
          {i.action.label} <Icon name="chevron" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}

export default function Insights() {
  const { mode } = useMode()
  const navigate = useNavigate()
  const dash = useDashboard(mode)
  const insights = useInsights(mode)
  const [q, setQ] = useState('')
  const d = dash.data
  const s = d && summary(d)
  const list = insights.data?.insights ?? []

  // Suggest a weekly target for the biggest regular cost that has no budget yet.
  const target = d?.categories.filter((l) => l.budgetKobo === null && l.avgMonthlyKobo > 0).sort((a, b) => b.avgMonthlyKobo - a.avgMonthlyKobo)[0]
  const weekly = target ? Math.max(Math.round((target.avgMonthlyKobo * 0.9 * 12) / 52 / 50000) * 50000, 50000) : 0

  // Signals not already covered by an insight card.
  const noticed = d?.indicators.filter((i) => !/^(trend-|budget-|supplier-costs$)/.test(i.id)) ?? []

  function ask(e: FormEvent) {
    e.preventDefault()
    if (q.trim()) navigate(route(q, mode))
  }

  const summaryCard = (
    <section className="overflow-hidden rounded-[16px] bg-brand-grad p-5 text-white">
      <p className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide">
        <Sparkle className="h-5 w-5" /> Your monthly summary
      </p>
      <p className="mt-1.5 text-[15px] font-semibold">Here’s what your money is telling you.</p>
      <p className="mt-2.5 text-[13px] leading-snug text-white/85">{s ? s.text : 'Reading your month…'}</p>
      <div className="mt-5 flex justify-between gap-4">
        <span>
          <span className="block text-[12px] text-white/75">Total spent</span>
          <span className="block text-[18px] font-semibold">{s ? naira(s.total) : '…'}</span>
        </span>
        <span className="min-w-0 text-right">
          <span className="block text-[12px] text-white/75">Top Category</span>
          <span className="block truncate text-[18px] font-semibold">{s?.top ?? '—'}</span>
        </span>
      </div>
    </section>
  )

  const askBox = (
    <section>
      <form onSubmit={ask} className="flex items-center gap-3 rounded-[16px] border border-black/[0.08] bg-white p-2 shadow-[0_8px_20px_-16px_rgb(0_0_0/0.4)] focus-within:border-brand/40">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-grad text-white">
          <Sparkle className="h-[18px] w-[18px]" />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask FinWise anything"
          aria-label="Ask FinWise anything"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#9a9195]"
        />
        <button type="submit" aria-label="Ask" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-40" disabled={!q.trim()}>
          <Icon name="send" className="h-4 w-4" stroke={2.2} />
        </button>
      </form>
      <div className="-mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
        {ASK[mode].map((a) => (
          <Link key={a.q} to={a.to} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#ffe9f1] px-3 py-1.5 text-[12px] text-brand transition hover:bg-[#ffd9e7]">
            <Sparkle className="h-3.5 w-3.5" /> {a.q}
          </Link>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-[#9a9195]">Answered by the Decision Simulator, using your own regular payments and habits.</p>
    </section>
  )

  const suggestion = target && (
    <section className="rounded-[16px] bg-[#ffe3ec] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-brand">Suggested weekly target</p>
      <p className="mt-1 text-[26px] font-semibold tracking-[-0.01em]">{naira(weekly)}</p>
      <p className="mt-1 text-[13px] text-[#6a5f64]">
        For {target.category}, based on your recent spending of about {naira(target.avgMonthlyKobo)} a month.
      </p>
      <Link to={`/budgets/new?category=${encodeURIComponent(target.category)}`} className="mt-4 flex items-center justify-center gap-2 rounded-[12px] bg-brand py-3 text-[14px] font-semibold text-white">
        Create a Budget <Icon name="chevron" className="h-4 w-4" />
      </Link>
    </section>
  )

  const cards = (
    <section>
      <h2 className="text-[19px] font-semibold">Insights for you</h2>
      <p className="text-[13px] text-[#7a7175]">
        Based on your spending activity{list.some((i) => i.source === 'ai') && <span className="text-[#9a9195]"> · worded with AI, numbers from your data</span>}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {insights.loading && !list.length && <p className="text-[14px] text-[#8a8185]">Loading…</p>}
        {!insights.loading && !list.length && (
          <div className={`${card} p-5 text-[14px] text-[#7a7175]`}>Nothing stands out yet. Insights appear once there are a few weeks of transactions to compare.</div>
        )}
        {list.map((i) => (
          <InsightCard key={i.id} i={i} />
        ))}
      </div>
      {noticed.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[15px] font-semibold">Also worth knowing</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {noticed.map((n) => (
              <li key={n.id} className={`${card} flex gap-3 p-3.5`}>
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${n.tone === 'good' ? 'bg-[#e2f3ea] text-[#1f8a5b]' : n.tone === 'neutral' ? 'bg-[#f4f2f3] text-[#6a6165]' : n.tone === 'critical' ? 'bg-[#fde4e4] text-[#d64545]' : 'bg-[#fff1dc] text-[#d9800f]'}`}>
                  <Icon name={n.tone === 'good' ? 'check' : 'alert'} className="h-3.5 w-3.5" stroke={2.4} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{n.title}</span>
                  <span className="block text-[12px] text-[#6a6165]">{n.evidence}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )

  return (
    <AppShell
      title="AI Insight"
      right={
        <Link to="/review" aria-label="Review transactions" className="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5">
          <Icon name="bell" />
        </Link>
      }
    >
      {(dash.error || insights.error) && <p className="mb-4 text-[14px] text-[#d64545]">{dash.error || insights.error}</p>}
      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          {summaryCard}
          {askBox}
          <div className="hidden lg:block">{suggestion}</div>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          {cards}
          <div className="lg:hidden">{suggestion}</div>
        </div>
      </div>
    </AppShell>
  )
}
