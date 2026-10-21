// GET /api/budgets?mode= — this month's budgets, or suggestions from the last 3 months if none are set.
// PUT /api/budgets         — save this month's budgets { mode, items: [{ category, amountKobo }] }.
import { z } from 'zod'
import { categoriesFor } from '../../shared/categories.js'
import { requireUser } from '../auth.js'
import { db } from '../db.js'
import { suggestBudgets } from '../engine/finance.js'
import { loadFinance } from '../engine/load.js'
import { handle, HttpError, readJson } from '../http.js'

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  const mode = new URL(request.url).searchParams.get('mode')
  if (mode !== 'personal' && mode !== 'business') throw new HttpError(400, 'mode must be personal or business')
  const f = await loadFinance(user.id, mode)
  const suggestions = new Map(suggestBudgets(f.lines).map((s) => [s.category, s.amountKobo]))

  // Every spending category, with the saved amount (or the suggestion) and recent average.
  const items = categoriesFor(mode, 'debit')
    .filter((c) => c !== 'Bank charges') // fees aren't something people budget for
    .map((category) => {
      const line = f.lines.find((l) => l.category === category)
      return {
        category,
        amountKobo: f.budgets.get(category) ?? null,
        suggestedKobo: suggestions.get(category) ?? null,
        avgMonthlyKobo: line?.avgMonthlyKobo ?? 0,
        spentKobo: line?.spentKobo ?? 0,
      }
    })
    .sort((a, b) => b.avgMonthlyKobo - a.avgMonthlyKobo)
  return Response.json({ month: f.period.month, hasBudgets: f.hasBudgets, items })
})

const Body = z.object({
  mode: z.enum(['personal', 'business']),
  items: z.array(z.object({ category: z.string(), amountKobo: z.number().int().min(0).max(10_000_000_000_00) })).max(40),
})

export const PUT = handle(async (request) => {
  const user = await requireUser(request)
  const { mode, items } = await readJson(request, Body)
  const allowed = new Set(categoriesFor(mode, 'debit'))
  const bad = items.find((i) => !allowed.has(i.category))
  if (bad) throw new HttpError(400, `${bad.category} is not a ${mode} spending category`)

  const f = await loadFinance(user.id, mode)
  const month = `${f.period.month}-01`
  // Replace this month's budgets with the submitted set (zero = no budget for that category).
  const keep = items.filter((i) => i.amountKobo > 0)
  await db().transaction((tx) => [
    tx`delete from budgets where user_id = ${user.id} and mode = ${mode} and period_month = ${month}::date`,
    ...keep.map(
      (i) => tx`insert into budgets (user_id, mode, category, period_month, amount_kobo)
                values (${user.id}, ${mode}, ${i.category}, ${month}::date, ${i.amountKobo})`,
    ),
  ])
  return Response.json({ ok: true, saved: keep.length })
})
