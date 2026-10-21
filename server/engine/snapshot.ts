// One computed picture of a user's month, shared by the dashboard, insights and simulator,
// so every screen shows the same numbers.
import type { Mode } from '../../shared/categories.js'
import { indicators, overview } from './finance.js'
import { loadFinance } from './load.js'

export async function snapshot(userId: string, mode: Mode) {
  const f = await loadFinance(userId, mode)
  const o = overview(f.rows, mode, f.period, f.accountIds, f.recurring)

  // Projected month-end balance = balance now + income still expected − spending still expected
  // − other regular money out still due (savings moves, unanswered regular transfers), which the
  //   category projections don't cover but which still leave the account.
  const stillToSpend = f.lines.reduce((n, l) => n + Math.max(l.projectedKobo - l.spentKobo, 0), 0)
  const projectedCats = new Set(f.lines.map((l) => l.category))
  const otherOutDue = f.recurring
    .filter((r) => r.direction === 'debit' && !r.paidThisMonth && r.status === 'due' && !(r.category && projectedCats.has(r.category)))
    .reduce((n, r) => n + r.typicalAmountKobo, 0)
  const projectedBalance = o.balance.asOf ? o.balance.totalKobo + o.incomeDueKobo - stillToSpend - otherOutDue : null

  return {
    ...f,
    overview: o,
    forecast: {
      projectedMonthEndBalanceKobo: projectedBalance,
      stillToSpendKobo: stillToSpend,
      otherOutDueKobo: otherOutDue,
      incomeDueKobo: o.incomeDueKobo,
      assumptions: [
        'Spending for the rest of the month follows what you usually spend after this day of the month, per category (last 3 months).',
        'Regular payments not yet made this month happen around their usual date.',
        o.incomeDueKobo ? 'Regular income not yet received this month arrives around its usual date.' : 'No regular income is expected before month end.',
        'Transactions without a category are not projected.',
      ],
      complete: o.balance.complete,
    },
    indicators: indicators(o, f.lines, f.recurring, f.period),
  }
}
