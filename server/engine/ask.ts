// "Ask FinWise": plain-language questions about your money, answered from your own data.
//   1. understand the question -> a typed Intent (AI, with a keyword fallback if AI is unavailable)
//   2. compute the answer with the engine (deterministic; the AI never produces a number)
//   3. reply with a sentence, the evidence behind it, and a link to see more
// "Can I afford…" / "What if…" questions run the Decision Simulator and answer inline.
import { z } from 'zod'
import { categoriesFor, type Mode } from '../../shared/categories.js'
import { ordinal } from '../../shared/text.js'
import { llmJson, LlmUnavailable } from '../llm.js'
import { isIncome, isSpend, monthKey, trusted, type Tx } from './finance.js'
import { buildModel, simulate, type Scenario } from './simulator.js'
import { snapshot } from './snapshot.js'

type PeriodName = 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_3_months'
const PERIODS: PeriodName[] = ['today', 'this_week', 'this_month', 'last_month', 'last_3_months']

export type Intent =
  | { type: 'spend'; category?: string; period: PeriodName }
  | { type: 'income'; period: PeriodName }
  | { type: 'top_categories'; period: PeriodName }
  | { type: 'compare'; category?: string }
  | { type: 'person'; name: string; period: PeriodName }
  | { type: 'subscriptions' }
  | { type: 'upcoming' }
  | { type: 'budgets' }
  | { type: 'forecast' }
  | { type: 'balance' }
  | { type: 'sales'; period: PeriodName }
  | { type: 'profit' }
  | { type: 'best_day' }
  | { type: 'top_customers'; period: PeriodName }
  | { type: 'simulate'; scenario: Scenario }
  | { type: 'unknown' }

export type Answer = {
  text: string
  evidence: string[]
  actions: { label: string; to: string }[]
  verdict?: 'ok' | 'tight' | 'shortfall'
  mode: Mode
  understoodBy: 'ai' | 'keywords'
}

const naira = (k: number) => `${k < 0 ? '−' : ''}₦${Math.abs(Math.round(k / 100)).toLocaleString('en-NG')}`
const sum = (rows: Tx[]) => rows.reduce((n, t) => n + t.amount_kobo, 0)
const LAGOS_MS = 60 * 60 * 1000
const lagos = (iso: string | Date) => new Date(new Date(iso).getTime() + LAGOS_MS)
const dayKey = (d: Date) => d.toISOString().slice(0, 10)
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
const PERIOD_WORDS: Record<PeriodName, string> = {
  today: 'today', this_week: 'this week', this_month: 'this month', last_month: 'last month', last_3_months: 'over the last 3 months',
}

// ---------- 1. understanding the question ----------

const IntentSchema = z.object({
  intent: z.enum(['spend', 'income', 'top_categories', 'compare', 'person', 'subscriptions', 'upcoming', 'budgets', 'forecast', 'balance', 'sales', 'profit', 'best_day', 'top_customers', 'simulate', 'unknown']),
  category: z.string().nullable().optional(),
  period: z.enum(['today', 'this_week', 'this_month', 'last_month', 'last_3_months']).nullable().optional(),
  name: z.string().nullable().optional(),
  scenario: z.enum(['purchase', 'salary_delay', 'expense_change', 'save_monthly', 'hire', 'revenue_drop', 'late_payment', 'supplier_increase']).nullable().optional(),
  amount_naira: z.number().nullable().optional(),
  days: z.number().nullable().optional(),
  percent: z.number().nullable().optional(),
})

async function understand(question: string, mode: Mode): Promise<{ intent: Intent; by: 'ai' | 'keywords' }> {
  const cats = categoriesFor(mode, 'debit')
  try {
    const r = await llmJson({
      system:
        'You classify one question a Nigerian user asks their personal/business finance app. Reply with JSON only: ' +
        '{"intent":..., "category":..., "period":..., "name":..., "scenario":..., "amount_naira":..., "days":..., "percent":...}. ' +
        'Intents: spend (how much spent, optionally on a category), income (money received/earned), top_categories (where money goes), ' +
        'compare (spending vs last month), person (money sent to or received from a named person/shop; put the name in "name"), ' +
        'subscriptions, upcoming (bills/payments coming), budgets (budget progress), forecast (month-end balance), balance (current balance), ' +
        'sales (business sales), profit (business profit), best_day (best sales day), top_customers (who pays the business most / who stopped buying), ' +
        'simulate (can I afford / what if: scenario purchase|salary_delay|expense_change|save_monthly|hire|revenue_drop|late_payment|supplier_increase), unknown. ' +
        `Category must be one of ${JSON.stringify(cats)} or null. Period: today|this_week|this_month|last_month|last_3_months or null. ` +
        'Amounts in naira as a plain number (50k = 50000). Do not invent values that are not in the question.',
      user: JSON.stringify({ mode, question }),
      schema: IntentSchema,
      maxTokens: 300,
      timeoutMs: 12_000,
    })
    return { intent: toIntent(r, mode), by: 'ai' }
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err
    return { intent: keywordIntent(question, mode), by: 'keywords' }
  }
}

/** Turn the classifier's raw output into a safe, complete Intent. */
function toIntent(r: z.infer<typeof IntentSchema>, mode: Mode): Intent {
  const period: PeriodName = r.period && PERIODS.includes(r.period) ? r.period : 'this_month'
  const cats = categoriesFor(mode, 'debit')
  const category = r.category && cats.find((c) => c.toLowerCase() === r.category!.toLowerCase())
  const amount = r.amount_naira && r.amount_naira > 0 ? Math.round(r.amount_naira) : undefined
  switch (r.intent) {
    case 'spend': return { type: 'spend', category: category || undefined, period }
    case 'income': return { type: 'income', period }
    case 'top_categories': return { type: 'top_categories', period }
    case 'compare': return { type: 'compare', category: category || undefined }
    case 'person': return r.name && r.name.trim().length >= 2 ? { type: 'person', name: r.name.trim(), period: r.period ? period : 'last_3_months' } : { type: 'unknown' }
    case 'sales': return { type: 'sales', period }
    case 'top_customers': return { type: 'top_customers', period: r.period ? period : 'last_3_months' }
    case 'simulate': return { type: 'simulate', scenario: scenarioFrom(r.scenario ?? 'purchase', mode, amount, r.days ?? undefined, r.percent ?? undefined, category || undefined) }
    case 'subscriptions': case 'upcoming': case 'budgets': case 'forecast': case 'balance': case 'profit': case 'best_day': case 'unknown':
      return { type: r.intent }
  }
}

/** Sensible defaults so a half-specified "what if" still runs. */
function scenarioFrom(kind: string, mode: Mode, amount?: number, days?: number, percent?: number, category?: string): Scenario {
  const kobo = (n: number | undefined, fallback: number) => Math.round((n ?? fallback) * 100)
  const clampPct = (p: number | undefined, d: number) => Math.min(Math.max(Math.round(p ?? d), 1), mode === 'business' ? 100 : 100)
  switch (kind) {
    case 'salary_delay': return mode === 'personal' ? { type: 'salary_delay', days: Math.min(Math.max(Math.round(days ?? 14), 1), 45) } : { type: 'purchase', amountKobo: kobo(amount, 50000), inDays: 3 }
    case 'expense_change': return { type: 'expense_change', category: category ?? 'Rent', monthlyKobo: kobo(amount, 20000) }
    case 'save_monthly': return mode === 'personal' ? { type: 'save_monthly', monthlyKobo: kobo(amount, 20000) } : { type: 'purchase', amountKobo: kobo(amount, 50000), inDays: 3 }
    case 'hire': return mode === 'business' ? { type: 'hire', monthlyKobo: kobo(amount, 60000) } : { type: 'purchase', amountKobo: kobo(amount, 60000), inDays: 3 }
    case 'revenue_drop': return mode === 'business' ? { type: 'revenue_drop', pct: clampPct(percent, 20) } : { type: 'purchase', amountKobo: kobo(amount, 50000), inDays: 3 }
    case 'late_payment': return mode === 'business' ? { type: 'late_payment', amountKobo: kobo(amount, 200000), dueInDays: 7, lateDays: Math.min(Math.max(Math.round(days ?? 14), 1), 30) } : { type: 'salary_delay', days: Math.min(Math.max(Math.round(days ?? 14), 1), 45) }
    case 'supplier_increase': return mode === 'business' ? { type: 'supplier_increase', pct: clampPct(percent, 10) } : { type: 'purchase', amountKobo: kobo(amount, 50000), inDays: 3 }
    default: return { type: 'purchase', amountKobo: kobo(amount, 50000), inDays: Math.min(Math.max(Math.round(days ?? 3), 1), 60) }
  }
}

/** Keyword fallback when the AI is unavailable. */
export function keywordIntent(question: string, mode: Mode): Intent {
  const t = question.toLowerCase()
  const m = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|m|million|thousand)?\b/)
  const amount = m ? Number(m[1].replace(/,/g, '')) * (m[2]?.startsWith('m') ? 1_000_000 : m[2] === 'k' || m[2] === 'thousand' ? 1_000 : 1) : undefined
  const pct = t.match(/(\d+)\s*%/)?.[1]
  const weeks = t.match(/(\d+|two|three|one)\s*week/)?.[1]
  const days = weeks ? ({ one: 1, two: 2, three: 3 }[weeks] ?? Number(weeks)) * 7 : Number(t.match(/(\d+)\s*day/)?.[1]) || undefined
  const period: PeriodName = /today/.test(t) ? 'today' : /this week|weekly/.test(t) ? 'this_week' : /last month/.test(t) ? 'last_month' : /3 months|three months|quarter/.test(t) ? 'last_3_months' : 'this_month'
  const category = categoriesFor(mode, 'debit').find((c) => t.includes(c.toLowerCase().split(' ')[0]))

  if (/afford|what if|can i |should i|hire|late|delay|drop|raise|increase|save .*every|go(es)? up/.test(t)) {
    const kind = /salary|paid late|pay ?day/.test(t) ? 'salary_delay' : /hire|staff|employ/.test(t) ? 'hire' : /sales|revenue/.test(t) && /drop|fall/.test(t) ? 'revenue_drop'
      : /customer|client|owe/.test(t) ? 'late_payment' : /supplier|stock/.test(t) ? 'supplier_increase' : /save/.test(t) ? 'save_monthly' : /rent|bill|go(es)? up|rise|increase/.test(t) ? 'expense_change' : 'purchase'
    return { type: 'simulate', scenario: scenarioFrom(kind, mode, amount, days, pct ? Number(pct) : undefined, category) }
  }
  if (/customer|who (pays|buys)|best buyer/.test(t)) return { type: 'top_customers', period: /this month/.test(t) ? 'this_month' : 'last_3_months' }
  if (/best day|busiest|which day/.test(t)) return { type: 'best_day' }
  if (/profit/.test(t)) return { type: 'profit' }
  if (/sales|sold|sell/.test(t)) return { type: 'sales', period }
  if (/subscri/.test(t)) return { type: 'subscriptions' }
  if (/bill|coming up|upcoming|due/.test(t)) return { type: 'upcoming' }
  if (/budget/.test(t)) return { type: 'budgets' }
  if (/month[- ]end|end of (the )?month|will i have/.test(t)) return { type: 'forecast' }
  if (/balance|how much (do i have|is left)/.test(t)) return { type: 'balance' }
  if (/compare|more than last|less than last|vs last/.test(t)) return { type: 'compare', category }
  if (/where.*(money|go)|biggest|most on/.test(t)) return { type: 'top_categories', period }
  if (/earn|income|received|got paid|came in/.test(t)) return { type: 'income', period }
  const person = t.match(/(?:sent|send|paid|pay|give|gave|to|from)\s+([a-z][a-z .'-]{1,40})\??$/)?.[1]
  if (person && !/food|transport|rent|bill/.test(person)) return { type: 'person', name: person.trim(), period: 'last_3_months' }
  if (/spen|spent|cost|expens/.test(t)) return { type: 'spend', category, period }
  return { type: 'unknown' }
}

// ---------- 2. computing the answer ----------

function inPeriod(t: Tx, p: PeriodName, now: Date, current: string, previous: string[]): boolean {
  const d = lagos(t.occurred_at)
  const today = lagos(now)
  switch (p) {
    case 'today': return dayKey(d) === dayKey(today)
    case 'this_week': {
      const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - ((today.getUTCDay() + 6) % 7)))
      return d >= monday && dayKey(d) <= dayKey(today)
    }
    case 'this_month': return monthKey(d) === current
    case 'last_month': return monthKey(d) === previous[0]
    case 'last_3_months': return previous.includes(monthKey(d))
  }
}

export async function ask(userId: string, question: string, mode: Mode, opts: { usesBusiness: boolean }): Promise<Answer> {
  const { intent, by } = await understand(question, mode)

  // Business questions asked from Personal mode are answered from the business, if there is one.
  const businessOnly = ['sales', 'profit', 'best_day', 'top_customers'].includes(intent.type)
  if (businessOnly && mode === 'personal' && !opts.usesBusiness) {
    return { text: "That's a business question, and you haven't turned on Business mode.", evidence: [], actions: [], mode, understoodBy: by }
  }
  const m: Mode = businessOnly ? 'business' : mode
  const s = await snapshot(userId, m)
  const now = new Date()
  const p = s.period
  const rows = s.rows
  const within = (t: Tx, period: PeriodName) => inPeriod(t, period, now, p.month, p.previous)
  const reply = (text: string, evidence: string[] = [], actions: Answer['actions'] = [], verdict?: Answer['verdict']): Answer => ({ text, evidence, actions, verdict, mode: m, understoodBy: by })
  const pw = (x: PeriodName) => PERIOD_WORDS[x]

  if (!rows.length) return reply('There are no transactions yet. Link your bank or upload a statement and ask again.', [], [{ label: 'Add transactions', to: '/import' }])

  switch (intent.type) {
    case 'spend': {
      const list = rows.filter((t) => isSpend(t) && within(t, intent.period) && (!intent.category || (t.category === intent.category && trusted(t))))
      const total = sum(list)
      const what = intent.category ? `on ${intent.category}` : 'in total'
      const evidence = [`${list.length} payment${list.length === 1 ? '' : 's'} ${pw(intent.period)}`]
      if (intent.category && intent.period === 'this_month') {
        const line = s.lines.find((l) => l.category === intent.category)
        if (line?.avgMonthlyKobo) evidence.push(`Your usual month: ${naira(line.avgMonthlyKobo)}`, `At this pace: about ${naira(line.projectedKobo)} by month end`)
        if (line?.budgetKobo != null) evidence.push(`Budget: ${naira(line.budgetKobo)}`)
      }
      const biggest = [...list].sort((a, b) => b.amount_kobo - a.amount_kobo)[0]
      if (biggest) evidence.push(`Biggest: ${naira(biggest.amount_kobo)} (${titleCase(biggest.narration.replace(/^(POS PURCHASE|TRANSFER TO)\s+/i, '')).slice(0, 40)})`)
      const actions = intent.category ? [{ label: `See ${intent.category} payments`, to: `/category?name=${encodeURIComponent(intent.category)}&month=${intent.period === 'last_month' ? p.previous[0] : p.month}` }] : [{ label: 'See all transactions', to: '/transactions' }]
      return reply(total ? `You spent ${naira(total)} ${what} ${pw(intent.period)}.` : `You haven't spent anything ${what} ${pw(intent.period)}.`, evidence, actions)
    }
    case 'income': {
      const list = rows.filter((t) => isIncome(t) && within(t, intent.period))
      const word = m === 'business' ? 'in sales and other income' : ''
      return reply(`${naira(sum(list))} came in ${word} ${pw(intent.period)}.`.replace('  ', ' '), [`${list.length} payment${list.length === 1 ? '' : 's'} in`, 'Transfers between your own accounts are not counted'])
    }
    case 'top_categories': {
      const list = rows.filter((t) => isSpend(t) && within(t, intent.period))
      const by = new Map<string, number>()
      for (const t of list) {
        const c = t.category && trusted(t) ? t.category : 'Not categorised yet'
        by.set(c, (by.get(c) ?? 0) + t.amount_kobo)
      }
      const total = sum(list)
      const top = [...by].sort((a, b) => b[1] - a[1]).slice(0, 4)
      if (!top.length) return reply(`Nothing spent ${pw(intent.period)} yet.`)
      const share = (k: number) => Math.round((k / total) * 100)
      return reply(
        `Most of your money ${pw(intent.period)} went on ${top[0][0]} (${naira(top[0][1])}, ${share(top[0][1])}%)${top[1] ? ` and ${top[1][0]} (${naira(top[1][1])}, ${share(top[1][1])}%)` : ''}.`,
        top.map(([c, k]) => `${c}: ${naira(k)} (${share(k)}%)`).concat(`Total: ${naira(total)}`),
        [{ label: 'Open Analytics', to: '/analytics' }],
      )
    }
    case 'compare': {
      const pick = (t: Tx) => isSpend(t) && (!intent.category || (t.category === intent.category && trusted(t)))
      const day = (t: Tx) => lagos(t.occurred_at).getUTCDate()
      const now$ = sum(rows.filter((t) => pick(t) && monthKey(lagos(t.occurred_at)) === p.month))
      const last$ = sum(rows.filter((t) => pick(t) && monthKey(lagos(t.occurred_at)) === p.previous[0] && day(t) <= p.day))
      const what = intent.category ?? 'spending'
      if (!last$) return reply(`You've spent ${naira(now$)} on ${what} this month. There's nothing to compare from last month at this point.`)
      const diff = Math.round(((now$ - last$) / last$) * 100)
      return reply(
        diff === 0 ? `Your ${what} is about the same as last month.` : `Your ${what} is ${Math.abs(diff)}% ${diff > 0 ? 'higher' : 'lower'} than last month at the same point.`,
        [`This month, up to the ${ordinal(p.day)}: ${naira(now$)}`, `Last month, up to the ${ordinal(p.day)}: ${naira(last$)}`],
      )
    }
    case 'person': {
      const words = intent.name.toUpperCase().split(/\s+/).filter((w) => w.length >= 2)
      const match = (t: Tx) => words.every((w) => t.narration.toUpperCase().includes(w))
      const list = rows.filter((t) => match(t) && within(t, intent.period))
      if (!list.length) return reply(`I couldn't find any payments to or from "${titleCase(intent.name)}" ${pw(intent.period)}.`, ['Names are matched against your bank descriptions'])
      const out = list.filter((t) => t.direction === 'debit')
      const inn = list.filter((t) => t.direction === 'credit')
      const last = [...list].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0]
      const who = titleCase(intent.name)
      const plural = (n: number) => `${n} payment${n === 1 ? '' : 's'}`
      const parts = [out.length ? `sent ${naira(sum(out))} to ${who} (${plural(out.length)})` : '', inn.length ? `received ${naira(sum(inn))} from ${who} (${plural(inn.length)})` : ''].filter(Boolean)
      return reply(`${pw(intent.period).replace(/^\w/, (c) => c.toUpperCase())}, you ${parts.join(' and ')}.`, [
        `Most recent: ${naira(last.amount_kobo)} on ${lagos(last.occurred_at).toISOString().slice(0, 10)}`,
        `Matched: ${titleCase(last.narration).slice(0, 50)}`,
      ], [{ label: 'Search transactions', to: '/transactions' }])
    }
    case 'subscriptions': {
      const subs = s.recurring.filter((r) => r.direction === 'debit' && r.category === 'Subscriptions')
      if (!subs.length) return reply("I don't see any regular subscriptions in your last 3 months.")
      const monthly = subs.reduce((n, r) => n + r.typicalAmountKobo, 0)
      return reply(`You have ${subs.length} subscriptions costing about ${naira(monthly)} a month (${naira(monthly * 12)} a year).`, subs.map((r) => `${r.name}: ${naira(r.typicalAmountKobo)} around the ${ordinal(r.typicalDay)}`), [{ label: 'See subscriptions', to: `/category?name=Subscriptions&month=${p.month}` }])
    }
    case 'upcoming': {
      const due = s.recurring.filter((r) => r.status !== 'paid')
      if (!due.length) return reply('All your regular payments for this month have already happened.')
      const out = due.filter((r) => r.direction === 'debit')
      return reply(`${out.length} regular payment${out.length === 1 ? '' : 's'} still to come this month, about ${naira(out.reduce((n, r) => n + r.typicalAmountKobo, 0))} in total.`, due.map((r) => `${r.direction === 'credit' ? '+' : '−'}${naira(r.typicalAmountKobo)} ${r.name}, around the ${ordinal(r.typicalDay)}`))
    }
    case 'budgets': {
      const b = s.lines.filter((l) => l.budgetKobo !== null)
      if (!b.length) return reply("You haven't set any budgets for this month yet.", [], [{ label: 'Create a budget', to: '/budgets/new' }])
      const trouble = b.filter((l) => l.status === 'over' || l.status === 'likely_over')
      const label = { on_track: 'on track', nearly_used: 'nearly used', likely_over: 'likely to go over', over: 'over budget', no_budget: '' } as const
      return reply(trouble.length ? `${trouble.length} of your ${b.length} budgets need attention: ${trouble.map((l) => l.category).join(', ')}.` : `All ${b.length} budgets are on track.`, b.map((l) => `${l.category}: ${naira(l.spentKobo)} of ${naira(l.budgetKobo!)} (${label[l.status]})`), [{ label: 'Open Budgets', to: '/budgets' }])
    }
    case 'forecast': {
      const f = s.forecast
      if (f.projectedMonthEndBalanceKobo === null) return reply("Your data doesn't include a balance, so I can't estimate your month end yet.")
      return reply(`You should end the month with about ${naira(f.projectedMonthEndBalanceKobo)}.`, f.assumptions.concat('This is an estimate, not a guarantee'), [{ label: 'Test a decision', to: '/simulator' }])
    }
    case 'balance': {
      const b = s.overview.balance
      if (!b.asOf) return reply("Your data doesn't include a reliable balance.")
      return reply(`Your balance is ${naira(b.totalKobo)}.`, [`From your latest statement balance (${lagos(b.asOf).toISOString().slice(0, 10)})`].concat(b.complete ? [] : [`${b.accounts - b.accountsWithBalance} account(s) don't report a balance`]))
    }
    case 'sales': {
      const list = rows.filter((t) => isIncome(t) && within(t, intent.period))
      const ev = [`${list.length} payment${list.length === 1 ? '' : 's'} from customers`]
      if (intent.period === 'this_month' && s.overview.business?.revenueVsLastMonthPct != null) ev.push(`${s.overview.business.revenueVsLastMonthPct >= 0 ? 'Up' : 'Down'} ${Math.abs(s.overview.business.revenueVsLastMonthPct)}% on last month at the same point`)
      if (s.overview.business?.unconfirmedCredits.count) ev.push(`${s.overview.business.unconfirmedCredits.count} credit(s) not counted until you confirm them`)
      return reply(`You made ${naira(sum(list))} in sales ${pw(intent.period)}.`, ev, [{ label: 'Open Analytics', to: '/analytics' }])
    }
    case 'profit': {
      const b = s.overview.business!
      return reply(`Your estimated profit so far this month is ${naira(b.profitKobo)}.`, [`Sales: ${naira(b.revenueKobo)}`, `Business costs: ${naira(b.costsKobo)}`, `You paid yourself ${naira(b.ownerDrawnKobo)} (not counted as a cost)`, b.caveat])
    }
    case 'best_day': {
      const days = s.overview.business!.salesByWeekday.filter((d) => d.avgKobo > 0)
      if (!days.length) return reply('There are not enough sales yet to see a pattern.')
      const best = days.reduce((a, c) => (c.avgKobo > a.avgKobo ? c : a))
      const worst = days.reduce((a, c) => (c.avgKobo < a.avgKobo ? c : a))
      return reply(`${best.day} is your best day, averaging ${naira(best.avgKobo)} in sales. ${worst.day} is the quietest at ${naira(worst.avgKobo)}.`, days.map((d) => `${d.day}: ${naira(d.avgKobo)}`).concat('Averages over the last 3 full months'))
    }
    case 'top_customers': {
      const credits = rows.filter((t) => isIncome(t) && t.match_key?.startsWith('FROM:'))
      const inP = credits.filter((t) => within(t, intent.period))
      const by = new Map<string, { kobo: number; n: number; last: string }>()
      for (const t of credits) {
        const k = t.match_key!.slice(5)
        const e = by.get(k) ?? { kobo: 0, n: 0, last: '' }
        if (within(t, intent.period)) { e.kobo += t.amount_kobo; e.n++ }
        if (t.occurred_at > e.last) e.last = t.occurred_at
        by.set(k, e)
      }
      const total = sum(inP)
      const top = [...by].filter(([, e]) => e.kobo > 0).sort((a, b) => b[1].kobo - a[1].kobo).slice(0, 5)
      if (!top.length) return reply(`No customer transfers ${pw(intent.period)} yet.`)
      // Regulars who have gone quiet: paid at least 4 times before, nothing in the last 14 days.
      const quiet = [...by].filter(([, e]) => e.n >= 4 && now.getTime() - new Date(e.last).getTime() > 14 * 86400000).map(([k]) => titleCase(k))
      const share = Math.round((sum(top.map(([, e]) => ({ amount_kobo: e.kobo }) as Tx)) / Math.max(total, 1)) * 100)
      return reply(
        `Your top customer ${pw(intent.period)} is ${titleCase(top[0][0])} (${naira(top[0][1].kobo)}). Your top ${top.length} bring in ${share}% of transfer sales.`,
        top.map(([k, e]) => `${titleCase(k)}: ${naira(e.kobo)} in ${e.n} payment${e.n === 1 ? '' : 's'}`).concat(quiet.length ? [`Gone quiet (no payment in 2 weeks): ${quiet.slice(0, 3).join(', ')}`] : []).concat('Based on bank transfers; POS and cash sales have no customer name'),
      )
    }
    case 'simulate': {
      if (!s.overview.balance.asOf) return reply("Your data doesn't include a balance, so I can't run the simulator yet.")
      const model = buildModel({ mode: m, rows, recurring: s.recurring, period: p, startBalanceKobo: s.overview.balance.totalKobo })
      const r = simulate(model, intent.scenario)
      const sc = intent.scenario
      const qs = new URLSearchParams({ scenario: sc.type })
      if ('amountKobo' in sc) qs.set('amount', String(Math.round(sc.amountKobo / 100)))
      if ('monthlyKobo' in sc) qs.set('amount', String(Math.round(sc.monthlyKobo / 100)))
      return reply(r.headline, [r.recommendation, `Lowest balance: ${naira(r.result.lowestKobo)} (was ${naira(r.baseline.lowestKobo)} without this)`, 'Estimate from your last 3 months; not a guarantee'], [{ label: 'Open in the simulator', to: `/simulator?${qs}` }], r.verdict as Answer['verdict'])
    }
    case 'unknown':
      return reply(
        "I'm not sure how to answer that yet. I can tell you what you spent (on anything, any month), where your money goes, your bills and subscriptions, your budgets and month-end balance, " +
          (opts.usesBusiness ? 'your sales, profit, best day and top customers, ' : '') +
          'or test a decision like "Can I afford ₦50k this week?".',
      )
  }
}
