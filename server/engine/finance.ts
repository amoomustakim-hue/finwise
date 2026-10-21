// The financial engine: deterministic maths only. AI never calculates numbers; it may only
// explain what this file returns. Every figure here can be traced to the rows it came from.
import { kindOf, type Mode } from '../../shared/categories.js'
import { ordinal } from '../../shared/text.js'

export type Tx = {
  id: string
  occurred_at: string // ISO
  amount_kobo: number
  direction: 'debit' | 'credit'
  narration: string
  category: string | null
  category_status: 'pending' | 'suggested' | 'confirmed'
  category_source: string | null
  category_confidence: number | null
  kind: string | null
  match_key: string | null
  account_id: string
  balance_after_kobo: number | null
}

// ---------- dates (Nigeria is UTC+1 all year, no daylight saving) ----------
const LAGOS_OFFSET_MS = 60 * 60 * 1000
const lagos = (iso: string | Date) => new Date(new Date(iso).getTime() + LAGOS_OFFSET_MS)
export const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const daysInMonth = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()

export type Period = { month: string; day: number; daysInMonth: number; daysLeft: number; previous: string[] }

export function currentPeriod(now = new Date()): Period {
  const l = lagos(now)
  const y = l.getUTCFullYear()
  const m0 = l.getUTCMonth()
  const dim = daysInMonth(y, m0)
  const previous = [1, 2, 3].map((k) => monthKey(new Date(Date.UTC(y, m0 - k, 1))))
  return { month: monthKey(l), day: l.getUTCDate(), daysInMonth: dim, daysLeft: dim - l.getUTCDate(), previous }
}

const txMonth = (t: Tx) => monthKey(lagos(t.occurred_at))
const txDay = (t: Tx) => lagos(t.occurred_at).getUTCDate()

// ---------- which rows count where ----------

/** A category is trusted for budgets once confirmed, or suggested by a confident keyword/user rule. AI suggestions wait for the user. */
export const trusted = (t: Tx) =>
  t.category_status === 'confirmed' ||
  (t.category_status === 'suggested' && (t.category_source === 'rule' || t.category_source === 'user_rule') && (t.category_confidence ?? 0) >= 0.85)

/** Counts toward total spending: expenses plus not-yet-categorised debits (never internal transfers). */
const isSpend = (t: Tx) => t.direction === 'debit' && (t.kind === 'expense' || t.kind === null)
const isIncome = (t: Tx) => t.direction === 'credit' && t.kind === 'income' && trusted(t)
/** In a business account, "Personal expense" is real money out but not a business cost. */
const isBusinessCost = (t: Tx) => isSpend(t) && t.category !== 'Personal expense'

const sum = (rows: Tx[]) => rows.reduce((n, t) => n + t.amount_kobo, 0)
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null)
const pretty = (narration: string) =>
  narration
    .replace(/^(POS PURCHASE|WEB PURCHASE|NIP TRANSFER|TRANSFER TO|TRANSFER FROM)\s+/i, '')
    .replace(/\s+REF\w*$/i, '')
    .replace(/\s+\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEPT?|OCT|NOV|DEC)[A-Z]*\b(\s+20\d\d)?/gi, '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

// ---------- recurring payments ----------

export type Recurring = {
  key: string
  name: string
  category: string | null
  direction: 'debit' | 'credit'
  typicalAmountKobo: number
  typicalDay: number
  monthsSeen: number
  paidThisMonth: boolean
  status: 'paid' | 'due' | 'late'
  dueInDays: number | null
}

/**
 * Same payee + similar amount, about once a month, in at least 2 of the last 3 full months.
 * Amounts must stay within 30% of each other; ≤ 2 payments a month (weekly habits aren't bills).
 */
export function findRecurring(rows: Tx[], p: Period): Recurring[] {
  const window = new Set([...p.previous, p.month])
  const groups = new Map<string, Tx[]>()
  for (const t of rows) {
    if (!t.match_key || !window.has(txMonth(t))) continue
    if (t.kind === 'internal_transfer' && t.direction === 'debit' && t.category !== 'Savings') continue
    const k = `${t.direction}|${t.match_key}`
    groups.set(k, [...(groups.get(k) ?? []), t])
  }

  const out: Recurring[] = []
  for (const [k, txs] of groups) {
    const byMonth = new Map<string, Tx[]>()
    for (const t of txs) byMonth.set(txMonth(t), [...(byMonth.get(txMonth(t)) ?? []), t])
    const fullMonths = p.previous.filter((m) => byMonth.has(m))
    if (fullMonths.length < 2) continue
    if ([...byMonth.values()].some((list) => list.length > 2)) continue
    const amounts = txs.map((t) => t.amount_kobo)
    if (Math.max(...amounts) > Math.min(...amounts) * 1.3) continue
    const typicalAmount = median(amounts)
    if (typicalAmount < 100000) continue // under ₦1,000: noise (small fees)

    // Bills land on a consistent day; a shop visited now and then does not.
    const days = txs.map(txDay)
    if (Math.max(...days) - Math.min(...days) > 7) continue
    const typicalDay = median(days)
    const paid = byMonth.has(p.month)
    const dueIn = typicalDay - p.day
    out.push({
      key: k,
      name: pretty(txs[txs.length - 1].narration),
      category: txs.find((t) => t.category)?.category ?? null,
      direction: k.startsWith('credit') ? 'credit' : 'debit',
      typicalAmountKobo: typicalAmount,
      typicalDay,
      monthsSeen: fullMonths.length + (paid ? 1 : 0),
      paidThisMonth: paid,
      status: paid ? 'paid' : dueIn < -3 ? 'late' : 'due',
      dueInDays: paid ? null : dueIn,
    })
  }
  return out.sort((a, b) => a.typicalDay - b.typicalDay)
}

// ---------- budgets & projections ----------

export type CategoryLine = {
  category: string
  spentKobo: number
  avgMonthlyKobo: number // average of the previous full months with data
  projectedKobo: number // expected total by month end
  budgetKobo: number | null
  status: 'on_track' | 'nearly_used' | 'likely_over' | 'over' | 'no_budget'
}

/**
 * Month-end projection for one category =
 *   spent so far this month
 * + what you usually spend in this category AFTER this day of the month
 *   (average over previous months that have data).
 * This respects timing without guessing which payments are bills: rent paid on the 1st adds
 * nothing late in the month, while daily food keeps adding. With no history, fall back to
 * this month's daily rate × days left.
 */
function project(cat: string, rows: Tx[], p: Period, spent: number): number {
  const inCat = rows.filter((t) => t.category === cat)
  const afterToday = p.previous
    .filter((m) => inCat.some((t) => txMonth(t) === m))
    .map((m) => sum(inCat.filter((t) => txMonth(t) === m && txDay(t) > p.day)))
  const rest = afterToday.length
    ? afterToday.reduce((a, b) => a + b, 0) / afterToday.length
    : (spent / Math.max(p.day, 1)) * p.daysLeft
  return Math.round(spent + rest)
}

export function budgetStatus(spent: number, projected: number, budget: number | null): CategoryLine['status'] {
  if (budget === null) return 'no_budget'
  if (spent > budget) return 'over'
  // "Heading over" is more useful than "nearly used" when both are true.
  if (projected > budget * 1.02) return 'likely_over'
  if (spent >= budget * 0.8) return 'nearly_used'
  return 'on_track'
}

export function categoryLines(rows: Tx[], p: Period, budgets: Map<string, number>): CategoryLine[] {
  const spendRows = rows.filter((t) => isSpend(t) && trusted(t) && t.category)
  const cats = new Set([...spendRows.map((t) => t.category!), ...budgets.keys()])
  return [...cats]
    .map((cat) => {
      const spent = sum(spendRows.filter((t) => t.category === cat && txMonth(t) === p.month))
      const prev = p.previous.map((m) => sum(spendRows.filter((t) => t.category === cat && txMonth(t) === m))).filter((v) => v > 0)
      const avg = prev.length ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length) : 0
      const projected = project(cat, spendRows, p, spent)
      const budget = budgets.get(cat) ?? null
      return { category: cat, spentKobo: spent, avgMonthlyKobo: avg, projectedKobo: projected, budgetKobo: budget, status: budgetStatus(spent, projected, budget) }
    })
    .sort((a, b) => b.spentKobo - a.spentKobo || b.avgMonthlyKobo - a.avgMonthlyKobo)
}

/** Suggested budget = average monthly spend over the last 3 full months, rounded up to ₦1,000. */
export function suggestBudgets(lines: CategoryLine[]): { category: string; amountKobo: number }[] {
  return lines
    .filter((l) => l.avgMonthlyKobo > 0)
    .map((l) => ({ category: l.category, amountKobo: Math.ceil(l.avgMonthlyKobo / 100000) * 100000 }))
}

// ---------- overview ----------

/** Latest running balance per account, if the source provides one. */
export function balances(rows: Tx[], accountIds: string[]) {
  const latest = new Map<string, Tx>()
  for (const t of rows) {
    if (t.balance_after_kobo === null) continue
    const cur = latest.get(t.account_id)
    if (!cur || t.occurred_at > cur.occurred_at) latest.set(t.account_id, t)
  }
  const known = accountIds.filter((id) => latest.has(id))
  return {
    totalKobo: known.reduce((n, id) => n + latest.get(id)!.balance_after_kobo!, 0),
    asOf: known.length ? known.map((id) => latest.get(id)!.occurred_at).sort()[0] : null,
    complete: known.length === accountIds.length && accountIds.length > 0,
    accountsWithBalance: known.length,
    accounts: accountIds.length,
  }
}

/** Month-to-date total for a month, up to the same day number as today (fair comparison). */
const mtd = (rows: Tx[], month: string, day: number, pred: (t: Tx) => boolean) =>
  sum(rows.filter((t) => txMonth(t) === month && txDay(t) <= day && pred(t)))

export type Indicator = { id: string; tone: 'good' | 'warning' | 'critical' | 'neutral'; title: string; evidence: string }

export function overview(rows: Tx[], mode: Mode, p: Period, accountIds: string[], recurring: Recurring[]) {
  const thisMonth = rows.filter((t) => txMonth(t) === p.month)
  const income = sum(thisMonth.filter(isIncome))
  const spend = sum(thisMonth.filter(isSpend))
  const uncategorised = thisMonth.filter((t) => t.category_status === 'pending')
  const bal = balances(rows, accountIds)

  // Same-day comparison against the average of previous months that have data.
  const prevSpendMtd = p.previous.map((m) => mtd(rows, m, p.day, isSpend)).filter((v) => v > 0)
  const avgSpendMtd = prevSpendMtd.length ? prevSpendMtd.reduce((a, b) => a + b, 0) / prevSpendMtd.length : 0

  // Expected money still to come and go before month end.
  const incomeDue = recurring.filter((r) => r.direction === 'credit' && !r.paidThisMonth && r.status === 'due' && kindOf(mode, r.category ?? '') === 'income')
  const billsDue = recurring.filter((r) => r.direction === 'debit' && !r.paidThisMonth && r.status === 'due')

  const result = {
    incomeKobo: income,
    spendKobo: spend,
    netKobo: income - spend,
    uncategorised: { count: uncategorised.length, kobo: sum(uncategorised) },
    balance: bal,
    spendVsUsualPct: avgSpendMtd ? pct(spend, avgSpendMtd) : null,
    incomeDueKobo: incomeDue.reduce((n, r) => n + r.typicalAmountKobo, 0),
    billsDueKobo: billsDue.reduce((n, r) => n + r.typicalAmountKobo, 0),
    business: null as null | ReturnType<typeof businessFigures>,
  }
  if (mode === 'business') result.business = businessFigures(rows, p)
  return result
}

/** Business: revenue, costs and estimated profit, this month vs last month (month-to-date, same day). */
export function businessFigures(rows: Tx[], p: Period) {
  const last = p.previous[0]
  const revenue = (m: string, d = 31) => mtd(rows, m, d, (t) => isIncome(t))
  const costs = (m: string, d = 31) => mtd(rows, m, d, isBusinessCost)
  const personalFromBusiness = mtd(rows, p.month, 31, (t) => isSpend(t) && t.category === 'Personal expense')
  const ownerDrawn = mtd(rows, p.month, 31, (t) => t.direction === 'debit' && t.category === "Owner's withdrawal")
  const unconfirmedCredits = rows.filter((t) => txMonth(t) === p.month && t.direction === 'credit' && t.category_status === 'pending')

  const rNow = revenue(p.month)
  const cNow = costs(p.month)
  const rLast = revenue(last, p.day)
  const cLast = costs(last, p.day)
  // Price signal: the average size of a restock payment, this month vs the previous 3 months.
  // (Monthly totals move with the number of restock days; the average payment tracks prices.)
  const restocks = (months: string[]) => rows.filter((t) => months.includes(txMonth(t)) && isBusinessCost(t) && t.category === 'Inventory & supplies')
  const avgTicket = (list: Tx[]) => (list.length ? sum(list) / list.length : 0)
  const restockNow = restocks([p.month])
  const restockBefore = restocks(p.previous)

  // Sales by weekday across the last 3 full months: average per day of that weekday.
  const weekday = Array.from({ length: 7 }, () => ({ total: 0, days: new Set<string>() }))
  for (const t of rows) {
    if (!p.previous.includes(txMonth(t)) || !isIncome(t)) continue
    const d = lagos(t.occurred_at)
    weekday[d.getUTCDay()].total += t.amount_kobo
    weekday[d.getUTCDay()].days.add(d.toISOString().slice(0, 10))
  }
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const salesByWeekday = weekday.map((w, i) => ({ day: names[i], avgKobo: w.days.size ? Math.round(w.total / w.days.size) : 0 }))

  return {
    revenueKobo: rNow,
    costsKobo: cNow,
    profitKobo: rNow - cNow,
    revenueVsLastMonthPct: pct(rNow, rLast),
    costsVsLastMonthPct: pct(cNow, cLast),
    profitLastMonthSameDayKobo: rLast - cLast,
    restockAvgNowKobo: Math.round(avgTicket(restockNow)),
    restockAvgBeforeKobo: Math.round(avgTicket(restockBefore)),
    restockAvgChangePct: restockNow.length >= 2 && restockBefore.length >= 4 ? pct(avgTicket(restockNow), avgTicket(restockBefore)) : null,
    personalFromBusinessKobo: personalFromBusiness,
    ownerDrawnKobo: ownerDrawn,
    unconfirmedCredits: { count: unconfirmedCredits.length, kobo: sum(unconfirmedCredits) },
    salesByWeekday,
    caveat:
      'Estimated from bank transactions only. Cash sales and costs paid outside these accounts are not included; ' +
      'owner withdrawals, transfers between your own accounts and unconfirmed credits are excluded.',
  }
}

/** Plain, evidence-backed signals (no unexplained score). */
export function indicators(o: ReturnType<typeof overview>, lines: CategoryLine[], recurring: Recurring[], p: Period): Indicator[] {
  const out: Indicator[] = []
  const naira = (k: number) => `₦${Math.round(k / 100).toLocaleString('en-NG')}`

  if (o.spendVsUsualPct !== null && Math.abs(o.spendVsUsualPct) >= 10) {
    const up = o.spendVsUsualPct > 0
    out.push({
      id: 'pace',
      tone: up ? (o.spendVsUsualPct >= 25 ? 'critical' : 'warning') : 'good',
      title: up ? `Spending is ${o.spendVsUsualPct}% higher than usual` : `Spending is ${-o.spendVsUsualPct}% lower than usual`,
      evidence: `${naira(o.spendKobo)} spent by day ${p.day}, compared with your average for the same point in the last ${p.previous.length} months.`,
    })
  }
  for (const l of lines.filter((x) => x.status === 'over' || x.status === 'likely_over').slice(0, 2)) {
    out.push({
      id: `budget-${l.category}`,
      tone: l.status === 'over' ? 'critical' : 'warning',
      title: l.status === 'over' ? `${l.category} is over budget` : `${l.category} is likely to go over budget`,
      evidence: `${naira(l.spentKobo)} spent of ${naira(l.budgetKobo ?? 0)}; at your usual pace it reaches about ${naira(l.projectedKobo)} by month end.`,
    })
  }
  // Categories heading well above their usual month (no budget needed to notice this).
  for (const l of lines.filter((x) => x.status === 'no_budget' && x.avgMonthlyKobo >= 1000000 && x.spentKobo > 0)) {
    const change = pct(l.projectedKobo, l.avgMonthlyKobo)
    if (change === null || change < 15) continue
    out.push({
      id: `trend-${l.category}`,
      tone: change >= 30 ? 'critical' : 'warning',
      title: `${l.category} is heading ${change}% above your usual month`,
      evidence: `${naira(l.spentKobo)} so far; at this pace about ${naira(l.projectedKobo)} by month end, against a usual ${naira(l.avgMonthlyKobo)}.`,
    })
  }
  const late = recurring.filter((r) => r.status === 'late' && r.direction === 'debit')
  if (late.length) {
    out.push({
      id: 'late-bills',
      tone: 'neutral',
      title: `${late.length} regular payment${late.length > 1 ? 's' : ''} not seen yet this month`,
      evidence: late.map((r) => `${r.name} (usually ~${naira(r.typicalAmountKobo)} around the ${ordinal(r.typicalDay)})`).join(', '),
    })
  }
  if (o.business) {
    const b = o.business
    if (b.restockAvgChangePct !== null && b.restockAvgChangePct >= 5) {
      out.push({
        id: 'supplier-costs',
        tone: 'warning',
        title: `Restock payments are ${b.restockAvgChangePct}% bigger than usual`,
        evidence: `Your average restock payment this month is ${naira(b.restockAvgNowKobo)}, against ${naira(b.restockAvgBeforeKobo)} over the previous 3 months. Supplier prices may have risen; check your selling prices still cover them.`,
      })
    }
    if (b.personalFromBusinessKobo > 0) {
      out.push({
        id: 'personal-in-business',
        tone: 'neutral',
        title: `${naira(b.personalFromBusinessKobo)} of personal spending came from the business account`,
        evidence: 'Not counted as a business cost, but it reduces the cash your business has to work with.',
      })
    }
  }
  if (o.uncategorised.count) {
    out.push({
      id: 'uncategorised',
      tone: 'neutral',
      title: `${o.uncategorised.count} transaction${o.uncategorised.count > 1 ? 's' : ''} need a category`,
      evidence: `${naira(o.uncategorised.kobo)} is counted in total spending but not in any budget until you say what it was for.`,
    })
  }
  return out
}
