// GET /api/dashboard?mode= — overview, budgets, upcoming payments and indicators for this month.
// Every number comes from server/engine/finance.ts (deterministic, traceable).
import { requireUser } from '../auth.js'
import { indicators, overview } from '../engine/finance.js'
import { loadFinance } from '../engine/load.js'
import { handle, HttpError } from '../http.js'

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  const mode = new URL(request.url).searchParams.get('mode')
  if (mode !== 'personal' && mode !== 'business') throw new HttpError(400, 'mode must be personal or business')

  const f = await loadFinance(user.id, mode)
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

  return Response.json({
    mode,
    period: f.period,
    overview: o,
    forecast: {
      projectedMonthEndBalanceKobo: projectedBalance,
      stillToSpendKobo: stillToSpend,
      otherOutDueKobo: otherOutDue,
      incomeDueKobo: o.incomeDueKobo,
      assumptions: [
        'Spending for the rest of the month follows your average daily pattern from the last 3 months, per category.',
        'Regular bills not yet paid this month are expected around their usual date.',
        o.incomeDueKobo ? 'Regular income not yet received this month arrives around its usual date.' : 'No regular income is expected before month end.',
        'Transactions without a category are not projected.',
      ],
      complete: o.balance.complete,
    },
    categories: f.lines,
    hasBudgets: f.hasBudgets,
    recurring: f.recurring,
    indicators: indicators(o, f.lines, f.recurring, f.period),
  })
})
