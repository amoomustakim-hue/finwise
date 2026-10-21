// Decision Simulator: a deterministic day-by-day cash projection (next 60 days), run twice —
// once as things are ("baseline") and once with the user's decision applied ("scenario").
//
// Model (all from the user's own last 3 full months):
//  • start from the latest known balance;
//  • regular payments/income (findRecurring) land on their usual day each month;
//  • everything else is spread as an average daily amount per category, and for business
//    sales, an average per weekday.
// It's an estimate with stated assumptions, never a guarantee.
import type { Mode } from '../../shared/categories.js'
import { ordinal } from '../../shared/text.js'
import { monthKey, type Period, type Recurring, type Tx } from './finance.js'

const HORIZON_DAYS = 60
const LAGOS_OFFSET_MS = 60 * 60 * 1000

export type Scenario =
  | { type: 'purchase'; amountKobo: number; inDays: number }
  | { type: 'salary_delay'; days: number }
  | { type: 'expense_change'; category: string; monthlyKobo: number } // + more (or − less) per month
  | { type: 'save_monthly'; monthlyKobo: number }
  | { type: 'hire'; monthlyKobo: number }
  | { type: 'revenue_drop'; pct: number }
  | { type: 'late_payment'; amountKobo: number; dueInDays: number; lateDays: number }
  | { type: 'supplier_increase'; pct: number }

type Day = { date: string; dom: number; dow: number; month: string }
type Model = {
  start: number
  days: Day[]
  recurring: Recurring[]
  dailyByCategory: Map<string, number> // non-recurring spend per day, by category
  dailyOtherOut: number // non-recurring uncategorised/other debits per day
  dailyIncomeOther: number // non-recurring personal income per day
  salesByWeekday: number[] // business: average non-recurring income on each weekday
  mode: Mode
}

const sumK = (xs: Tx[]) => xs.reduce((n, t) => n + t.amount_kobo, 0)

export function buildModel(input: { mode: Mode; rows: Tx[]; recurring: Recurring[]; period: Period; startBalanceKobo: number; now?: Date }): Model {
  const { rows, recurring, period: p, mode } = input
  const now = new Date((input.now ?? new Date()).getTime() + LAGOS_OFFSET_MS)
  const days: Day[] = []
  for (let i = 1; i <= HORIZON_DAYS; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i))
    days.push({ date: d.toISOString().slice(0, 10), dom: d.getUTCDate(), dow: d.getUTCDay(), month: monthKey(d) })
  }

  const prev = new Set(p.previous)
  const inPrev = (t: Tx) => prev.has(monthKey(new Date(new Date(t.occurred_at).getTime() + LAGOS_OFFSET_MS)))
  const recurringKeys = new Set(recurring.map((r) => r.key))
  const isRecurring = (t: Tx) => recurringKeys.has(`${t.direction}|${t.match_key}`)
  const monthsWithData = Math.max(p.previous.filter((m) => rows.some((t) => monthKey(new Date(new Date(t.occurred_at).getTime() + LAGOS_OFFSET_MS)) === m)).length, 1)
  const perDay = (k: number) => k / (monthsWithData * 30.4)

  const base = rows.filter((t) => inPrev(t) && !isRecurring(t))
  const dailyByCategory = new Map<string, number>()
  let otherOut = 0
  for (const t of base.filter((x) => x.direction === 'debit')) {
    if (t.kind === 'expense' && t.category) dailyByCategory.set(t.category, (dailyByCategory.get(t.category) ?? 0) + t.amount_kobo)
    else otherOut += t.amount_kobo // pending, internal moves out, other
  }
  for (const [k, v] of dailyByCategory) dailyByCategory.set(k, perDay(v))

  // Only money we know is income (or a refund); unconfirmed credits — possibly a loan — are left out.
  const credits = base.filter((x) => x.direction === 'credit' && (x.kind === 'income' || x.kind === 'refund'))
  const salesByWeekday = Array(7).fill(0)
  let dailyIncomeOther = 0
  if (mode === 'business') {
    // Average per weekday: total on that weekday ÷ number of such weekdays in the months with data.
    const totals = Array(7).fill(0)
    for (const t of credits) totals[new Date(new Date(t.occurred_at).getTime() + LAGOS_OFFSET_MS).getUTCDay()] += t.amount_kobo
    for (let w = 0; w < 7; w++) salesByWeekday[w] = totals[w] / ((monthsWithData * 30.4) / 7)
  } else {
    dailyIncomeOther = perDay(sumK(credits))
  }

  return { start: input.startBalanceKobo, days, recurring, dailyByCategory, dailyOtherOut: perDay(otherOut), dailyIncomeOther, salesByWeekday, mode }
}

/** Run the model; returns the balance at the end of each day. */
function run(m: Model, s: Scenario | null): number[] {
  const out: number[] = []
  let bal = m.start
  const firstMonth = m.days[0].month
  m.days.forEach((d, i) => {
    // Regular items on their usual day (this month's already-paid items are skipped).
    for (const r of m.recurring) {
      if (d.month === firstMonth && r.paidThisMonth) continue
      let day = r.typicalDay
      const isIncome = r.direction === 'credit'
      if (s?.type === 'salary_delay' && isIncome && m.mode === 'personal') day += s.days
      // Shift into next month if the delay pushes past month end.
      const lands = day <= daysIn(d.month) ? d.dom === day : d.dom === day - daysIn(prevMonth(d.month))
      if (!lands) continue
      bal += isIncome ? r.typicalAmountKobo : -r.typicalAmountKobo
    }

    // Day-to-day spending by category.
    for (const [cat, perDay] of m.dailyByCategory) {
      let v = perDay
      if (s?.type === 'supplier_increase' && cat === 'Inventory & supplies') v *= 1 + s.pct / 100
      bal -= v
    }
    bal -= m.dailyOtherOut

    // Day-to-day income.
    if (m.mode === 'business') {
      let sales = m.salesByWeekday[d.dow]
      if (s?.type === 'revenue_drop') sales *= 1 - s.pct / 100
      bal += sales
    } else {
      bal += m.dailyIncomeOther
    }

    // Decisions.
    if (s?.type === 'purchase' && i + 1 === Math.max(1, s.inDays)) bal -= s.amountKobo
    if (s?.type === 'expense_change') bal -= s.monthlyKobo / 30.4
    if (s?.type === 'save_monthly' && d.dom === 1) bal -= s.monthlyKobo
    if (s?.type === 'hire' && d.dom === 28) bal -= s.monthlyKobo
    if (s?.type === 'late_payment' && i + 1 === s.dueInDays + s.lateDays) bal += s.amountKobo
    out.push(Math.round(bal))
  })
  return out
}

/** Baseline for late_payment includes the payment on time, so the comparison is fair. */
function runBaseline(m: Model, s: Scenario): number[] {
  if (s.type === 'late_payment') return run(m, { ...s, lateDays: 0 })
  return run(m, null)
}

const daysIn = (month: string) => {
  const [y, mo] = month.split('-').map(Number)
  return new Date(Date.UTC(y, mo, 0)).getUTCDate()
}
const prevMonth = (month: string) => {
  const [y, mo] = month.split('-').map(Number)
  return monthKey(new Date(Date.UTC(y, mo - 2, 1)))
}

/**
 * Business: usual monthly profit = average monthly sales − business costs (day-to-day costs by
 * category, excluding personal spending, plus regular non-internal payments), and how a decision
 * changes it. One-off and timing decisions (a purchase, a late payment) don't change it.
 */
function monthlyProfit(m: Model, s: Scenario) {
  const sales = (m.salesByWeekday.reduce((a, c) => a + c, 0) * 30.4) / 7
  const dayCosts = [...m.dailyByCategory].filter(([c]) => c !== 'Personal expense').reduce((n, [, v]) => n + v, 0) * 30.4
  const regular = m.recurring
    .filter((r) => r.direction === 'debit' && r.category && !["Owner's withdrawal", 'Own-account transfer', 'Savings'].includes(r.category))
    .reduce((n, r) => n + r.typicalAmountKobo, 0)
  const inventory = (m.dailyByCategory.get('Inventory & supplies') ?? 0) * 30.4
  const baseline = Math.round(sales - dayCosts - regular)
  let scenario = baseline
  if (s.type === 'hire') scenario -= s.monthlyKobo
  if (s.type === 'revenue_drop') scenario -= Math.round((sales * s.pct) / 100)
  if (s.type === 'supplier_increase') scenario -= Math.round((inventory * s.pct) / 100)
  if (s.type === 'expense_change') scenario -= s.monthlyKobo
  return { baselineKobo: baseline, scenarioKobo: scenario }
}

export function simulate(m: Model, s: Scenario) {
  const baseline = runBaseline(m, s)
  const scenario = run(m, s)
  const naira = (k: number) => `${k < 0 ? '−' : ''}₦${Math.abs(Math.round(k / 100)).toLocaleString('en-NG')}`

  const stats = (series: number[]) => {
    let low = 0
    series.forEach((v, i) => v < series[low] && (low = i))
    const monthEnd = m.days.findIndex((d, i) => i + 1 < m.days.length && m.days[i + 1].month !== d.month)
    return {
      lowestKobo: series[low],
      lowestDate: m.days[low].date,
      monthEndKobo: monthEnd >= 0 ? series[monthEnd] : series[series.length - 1],
      endKobo: series[series.length - 1],
    }
  }
  const b = stats(baseline)
  const sc = stats(scenario)

  // A cushion of one week of usual spending counts as "comfortable".
  const weeklySpend = ([...m.dailyByCategory.values()].reduce((a, c) => a + c, 0) + m.dailyOtherOut) * 7
  const verdict = sc.lowestKobo < 0 ? 'shortfall' : sc.lowestKobo < weeklySpend ? 'tight' : 'ok'
  const lowDate = new Date(`${sc.lowestDate}T12:00:00Z`)
  const when = `${ordinal(lowDate.getUTCDate())} ${lowDate.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`

  let headline =
    verdict === 'shortfall'
      ? `This would leave you about ${naira(-sc.lowestKobo)} short around the ${when}.`
      : verdict === 'tight'
        ? `Possible, but tight: your balance would dip to about ${naira(sc.lowestKobo)} around the ${when}.`
        : `This looks manageable: your lowest balance would be about ${naira(sc.lowestKobo)} (around the ${when}).`

  // Business: the lasting effect is on monthly profit, not just cash timing.
  const profit = m.mode === 'business' ? monthlyProfit(m, s) : null
  if (profit && profit.baselineKobo !== profit.scenarioKobo) {
    headline += ` Your usual monthly profit would go from about ${naira(profit.baselineKobo)} to ${naira(profit.scenarioKobo)}.`
  }

  // One specific, computed next step.
  const cushion = weeklySpend
  const lowIndex = scenario.indexOf(sc.lowestKobo)
  const daysToLow = Math.max(lowIndex + 1, 1)
  let recommendation: string
  if (s.type === 'purchase' && verdict !== 'ok') {
    const safe = Math.max(b.lowestKobo - cushion, 0)
    recommendation =
      safe >= 100000
        ? `To keep a week's cushion, keep this purchase under about ${naira(safe)}, or wait until after your next income arrives.`
        : `There's no room for this right now without dipping below a week's cushion. Waiting until after your next income is safer.`
  } else if (verdict !== 'ok') {
    const needed = cushion - sc.lowestKobo
    recommendation = `Cutting about ${naira(needed / daysToLow)} a day from now until the ${when} (or setting aside ${naira(needed)}) would keep you comfortable.`
  } else if (profit && profit.scenarioKobo < profit.baselineKobo) {
    const gap = profit.baselineKobo - profit.scenarioKobo
    const sales = (m.salesByWeekday.reduce((a, c) => a + c, 0) * 30.4) / 7
    recommendation =
      s.type === 'supplier_increase'
        ? `Raising your selling prices by about ${((gap / Math.max(sales, 1)) * 100).toFixed(1)}% would cover the higher supplier cost.`
        : `Sales would need to rise by about ${naira(gap)} a month (${((gap / Math.max(sales, 1)) * 100).toFixed(1)}%) to keep profit where it is.`
  } else {
    recommendation = `You'd still have about ${naira(sc.lowestKobo - cushion)} above a week's cushion at your lowest point.`
  }

  return {
    scenario: s,
    recommendation,
    days: m.days.map((d, i) => ({ date: d.date, baselineKobo: baseline[i], scenarioKobo: scenario[i] })),
    baseline: b,
    result: sc,
    verdict,
    headline,
    differenceAtEndKobo: sc.endKobo - b.endKobo,
    monthlyProfit: profit,
    cushionKobo: Math.round(weeklySpend),
    assumptions: [
      `Starts from your latest known balance (${naira(m.start)}).`,
      'Regular payments and income happen around their usual day each month.',
      m.mode === 'business'
        ? 'Sales follow your average for each day of the week over the last 3 months.'
        : 'Other spending follows your average daily pattern over the last 3 months.',
      `"Comfortable" means keeping at least one week of usual spending (${naira(weeklySpend)}) in the account.`,
      'Unrecorded or unusual spending would change the result.',
    ],
  }
}
