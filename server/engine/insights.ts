// Insights: the engine chooses what matters and computes every number; the AI may only reword.
// Each insight has evidence (the facts it rests on) and one practical action.
import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { Mode } from '../../shared/categories.js'
import { ordinal } from '../../shared/text.js'
import { db } from '../db.js'
import { llmJson, LlmUnavailable } from '../llm.js'
import type { CategoryLine, Indicator, Period, Recurring } from './finance.js'

export type Insight = {
  id: string
  title: string
  body: string // the recommendation, one practical next step
  evidence: string[] // traceable facts behind it
  action: { label: string; to: string }
  priority: number // higher = more important
  source: 'template' | 'ai'
}

const naira = (k: number) => `₦${Math.round(k / 100).toLocaleString('en-NG')}`
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : 0)

type Business = {
  revenueKobo: number; profitKobo: number; ownerDrawnKobo: number; personalFromBusinessKobo: number
  salesByWeekday: { day: string; avgKobo: number }[]; restockAvgChangePct: number | null
  restockAvgNowKobo: number; restockAvgBeforeKobo: number
}

export function buildInsights(input: {
  mode: Mode
  period: Period
  lines: CategoryLine[]
  recurring: Recurring[]
  indicators: Indicator[]
  projectedMonthEndKobo: number | null
  incomeThisMonthKobo: number
  business: Business | null
}): Insight[] {
  const { period: p, lines } = input
  const out: Insight[] = []
  const daysLeft = Math.max(p.daysLeft, 1)

  // 1. Budget pressure (only where a budget exists).
  for (const l of lines.filter((x) => x.budgetKobo !== null && (x.status === 'over' || x.status === 'likely_over'))) {
    const budget = l.budgetKobo!
    const left = budget - l.spentKobo
    out.push({
      id: `budget-${l.category}`,
      title: l.status === 'over' ? `${l.category} is ${naira(-left)} over budget` : `${l.category} is heading over budget`,
      body:
        left > 0
          ? `Keep ${l.category} to about ${naira(left / daysLeft)} a day for the next ${daysLeft} days to stay within ${naira(budget)}.`
          : `Pause extra ${l.category} spending for the rest of the month, or raise the budget if ${naira(budget)} was too tight.`,
      evidence: [`${naira(l.spentKobo)} spent of ${naira(budget)} by day ${p.day}`, `Usual pace reaches about ${naira(l.projectedKobo)} by month end`],
      action: { label: `See ${l.category} spending`, to: `/category?name=${encodeURIComponent(l.category)}&month=${p.month}` },
      priority: l.status === 'over' ? 95 : 85,
      source: 'template',
    })
  }

  // 2. A category running well above its usual month (no budget needed).
  for (const l of lines.filter((x) => x.budgetKobo === null && x.avgMonthlyKobo >= 1000000 && x.spentKobo > 0)) {
    const change = pct(l.projectedKobo, l.avgMonthlyKobo)
    if (change < 15) continue
    const roomLeft = l.avgMonthlyKobo - l.spentKobo
    out.push({
      id: `trend-${l.category}`,
      title: `${l.category} is up ${change}% on your usual month`,
      body:
        roomLeft > 0
          ? `Spending about ${naira(roomLeft / daysLeft)} a day on ${l.category} for the rest of the month brings you back to your usual ${naira(l.avgMonthlyKobo)}.`
          : `You've already passed your usual ${naira(l.avgMonthlyKobo)} for ${l.category}; setting a budget would help you catch it earlier next month.`,
      evidence: [`${naira(l.spentKobo)} so far this month`, `About ${naira(l.projectedKobo)} expected by month end`, `Usual month: ${naira(l.avgMonthlyKobo)} (last 3 months)`],
      action: roomLeft > 0 ? { label: `Set a ${l.category} budget`, to: '/budgets' } : { label: 'Set budgets', to: '/budgets' },
      priority: 70 + Math.min(change, 25),
      source: 'template',
    })
  }

  // 3. Subscriptions (personal): the easy-to-forget monthly costs.
  if (input.mode === 'personal') {
    const subs = input.recurring.filter((r) => r.direction === 'debit' && r.category === 'Subscriptions')
    if (subs.length >= 2) {
      const monthly = subs.reduce((n, r) => n + r.typicalAmountKobo, 0)
      out.push({
        id: 'subscriptions',
        title: `${subs.length} subscriptions cost you ${naira(monthly)} a month`,
        body: `That's ${naira(monthly * 12)} a year. Cancel any you no longer use, even the small ones.`,
        evidence: subs.map((r) => `${r.name}: ${naira(r.typicalAmountKobo)} around the ${ordinal(r.typicalDay)}`),
        action: { label: 'Review subscriptions', to: `/category?name=Subscriptions&month=${p.month}` },
        priority: 60,
        source: 'template',
      })
    }
  }

  // 4. Month-end cash risk.
  if (input.projectedMonthEndKobo !== null && input.projectedMonthEndKobo < 0) {
    out.push({
      id: 'month-end-shortfall',
      title: `You may run short by ${naira(-input.projectedMonthEndKobo)} this month`,
      body: 'Test changes in the Decision Simulator before your next big payment.',
      evidence: [`Estimated month-end balance: ${naira(input.projectedMonthEndKobo)}`],
      action: { label: 'Open the simulator', to: '/simulator' },
      priority: 100,
      source: 'template',
    })
  }

  // Business-specific insights.
  const b = input.business
  if (b) {
    const days = b.salesByWeekday.filter((d) => d.avgKobo > 0)
    if (days.length >= 5) {
      const best = days.reduce((a, c) => (c.avgKobo > a.avgKobo ? c : a))
      const others = days.filter((d) => d !== best && d.day !== 'Sunday')
      const avgOthers = others.reduce((n, d) => n + d.avgKobo, 0) / Math.max(others.length, 1)
      const ratio = avgOthers ? best.avgKobo / avgOthers : 0
      if (ratio >= 1.4) {
        const before = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(best.day) + 6) % 7]
        out.push({
          id: 'best-day',
          title: `${best.day}s bring in ${ratio.toFixed(1)}x your usual daily sales`,
          body: `Make sure you're fully stocked by ${before} night so you don't miss ${best.day} sales.`,
          evidence: [`${best.day} average: ${naira(best.avgKobo)}`, `Other weekdays average: ${naira(avgOthers)}`, 'Based on the last 3 full months'],
          action: { label: 'See sales by day', to: '/home' },
          priority: 75,
          source: 'template',
        })
      }
    }
    if (b.restockAvgChangePct !== null && b.restockAvgChangePct >= 5) {
      out.push({
        id: 'restock-prices',
        title: `Restock payments are ${b.restockAvgChangePct}% bigger than usual`,
        body: `If supplier prices went up, check your selling prices still cover them, or compare another supplier this week.`,
        evidence: [`Average restock payment now: ${naira(b.restockAvgNowKobo)}`, `Previous 3 months: ${naira(b.restockAvgBeforeKobo)}`],
        action: { label: 'Test a price change', to: '/simulator?scenario=supplier_increase' },
        priority: 82,
        source: 'template',
      })
    }
    if (b.ownerDrawnKobo > 0 && b.profitKobo > 0 && b.ownerDrawnKobo > b.profitKobo * 0.6) {
      out.push({
        id: 'owner-draw',
        title: `You've taken ${naira(b.ownerDrawnKobo)} out, against ${naira(b.profitKobo)} estimated profit`,
        body: 'Taking out more than the business earns shrinks the money you use to restock. Keep weekly withdrawals steady.',
        evidence: [`Owner withdrawals this month: ${naira(b.ownerDrawnKobo)}`, `Estimated profit this month: ${naira(b.profitKobo)}`],
        action: { label: 'Open the simulator', to: '/simulator' },
        priority: 78,
        source: 'template',
      })
    }
    if (b.personalFromBusinessKobo > 0) {
      out.push({
        id: 'personal-in-business',
        title: `${naira(b.personalFromBusinessKobo)} of personal spending came from the business account`,
        body: 'Pay personal costs from your personal account so you can see what the business really makes.',
        evidence: [`Personal expenses paid from the business account this month: ${naira(b.personalFromBusinessKobo)}`],
        action: { label: 'Review transactions', to: '/review' },
        priority: 65,
        source: 'template',
      })
    }
  }

  return out.sort((a, b2) => b2.priority - a.priority).slice(0, 3)
}

// ---------- AI wording (optional; numbers are never taken from the AI) ----------

const Wording = z.object({ insights: z.array(z.object({ id: z.string(), title: z.string().max(140), body: z.string().max(300) })) })

/** Every ₦ amount and percentage in a text. */
const numbersIn = (s: string) => (s.match(/₦\s?[\d,]+|\d+(\.\d+)?%|\d+(\.\d+)?x/g) ?? []).map((t) => t.replace(/\s/g, ''))

/** Reword insights in friendly Nigerian English. Any wording that introduces a number we didn't compute is rejected. */
export async function wordInsights(userId: string, insights: Insight[]): Promise<Insight[]> {
  if (!insights.length) return insights
  const facts = insights.map((i) => ({ id: i.id, title: i.title, body: i.body, evidence: i.evidence }))
  const hash = createHash('sha256').update(JSON.stringify(facts)).digest('hex')

  let wording: z.infer<typeof Wording> | null = null
  const cached = (await db()`select wording from insight_wording where user_id = ${userId} and facts_hash = ${hash}`) as { wording: z.infer<typeof Wording> }[]
  if (cached[0]) {
    wording = cached[0].wording
  } else {
    try {
      wording = await llmJson({
        model: 'smart',
        system:
          'You rewrite short money insights for a Nigerian personal/business finance app in warm, plain, friendly Nigerian English ' +
          '(no slang overload, no pidgin unless natural, no emojis). Keep each title under 12 words and each body under 30 words. ' +
          'Use ONLY the numbers that appear in the facts given, written exactly the same way (₦ amounts and percentages). ' +
          'Do not add new numbers, dates, advice about loans, or anything not supported by the facts. Keep the same practical next step. ' +
          'Reply as JSON: {"insights":[{"id":"...","title":"...","body":"..."}]}',
        user: JSON.stringify(facts),
        schema: Wording,
        maxTokens: 1200,
        timeoutMs: 20_000,
      })
      await db()`
        insert into insight_wording (user_id, facts_hash, wording) values (${userId}, ${hash}, ${JSON.stringify(wording)}::jsonb)
        on conflict do nothing`
    } catch (err) {
      if (!(err instanceof LlmUnavailable)) throw err
      return insights // template wording
    }
  }

  return insights.map((i) => {
    const w = wording?.insights.find((x) => x.id === i.id)
    if (!w) return i
    const allowed = new Set(numbersIn([i.title, i.body, ...i.evidence].join(' ')))
    const introduced = numbersIn(`${w.title} ${w.body}`).filter((n) => !allowed.has(n))
    return introduced.length ? i : { ...i, title: w.title, body: w.body, source: 'ai' as const }
  })
}
