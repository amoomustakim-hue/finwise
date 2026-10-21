// Loads what the engine needs for one user + mode: ~4 months of transactions, accounts, budgets.
import type { Mode } from '../../shared/categories.js'
import { db } from '../db.js'
import { categoryLines, currentPeriod, findRecurring, type Period, type Tx } from './finance.js'

export async function loadFinance(userId: string, mode: Mode, now = new Date()) {
  const period: Period = currentPeriod(now)
  const since = `${period.previous[period.previous.length - 1]}-01T00:00:00+01:00`

  // The three reads are independent: run them in parallel (each is one HTTP round trip to Neon).
  const [rows, accounts, budgetRows] = (await Promise.all([
    db()`
      select id, occurred_at, amount_kobo::int as amount_kobo, direction, narration, category, category_status,
             category_source, category_confidence, kind, match_key, account_id, balance_after_kobo::int as balance_after_kobo
      from transactions
      where user_id = ${userId} and mode = ${mode} and occurred_at >= ${since}::timestamptz
      order by occurred_at, created_at`,
    db()`select id from accounts where user_id = ${userId} and mode = ${mode}`,
    db()`
      select category, amount_kobo::int as amount_kobo from budgets
      where user_id = ${userId} and mode = ${mode} and period_month = ${`${period.month}-01`}::date`,
  ])) as [Tx[], { id: string }[], { category: string; amount_kobo: number }[]]
  // occurred_at comes back as a Date from the driver; normalise to ISO strings.
  for (const r of rows) r.occurred_at = new Date(r.occurred_at).toISOString()
  const budgets = new Map(budgetRows.map((b) => [b.category, b.amount_kobo]))

  const recurring = findRecurring(rows, period)
  const lines = categoryLines(rows, period, budgets)
  return { period, rows, accountIds: accounts.map((a) => a.id), budgets, hasBudgets: budgetRows.length > 0, recurring, lines }
}
