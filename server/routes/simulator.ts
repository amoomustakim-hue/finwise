// POST /api/simulator { mode, scenario } — run a decision against the user's own cash pattern.
import { z } from 'zod'
import { requireUser } from '../auth.js'
import { snapshot } from '../engine/snapshot.js'
import { buildModel, simulate, type Scenario } from '../engine/simulator.js'
import { handle, HttpError, readJson } from '../http.js'

const kobo = z.number().int().min(0).max(100_000_000_000) // up to ₦1bn
const ScenarioSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('purchase'), amountKobo: kobo, inDays: z.number().int().min(1).max(60) }),
  z.object({ type: z.literal('salary_delay'), days: z.number().int().min(1).max(45) }),
  z.object({ type: z.literal('expense_change'), category: z.string().min(1), monthlyKobo: z.number().int().min(-10_000_000_000).max(10_000_000_000) }),
  z.object({ type: z.literal('save_monthly'), monthlyKobo: kobo }),
  z.object({ type: z.literal('hire'), monthlyKobo: kobo }),
  z.object({ type: z.literal('revenue_drop'), pct: z.number().min(1).max(100) }),
  z.object({ type: z.literal('late_payment'), amountKobo: kobo, dueInDays: z.number().int().min(1).max(30), lateDays: z.number().int().min(1).max(30) }),
  z.object({ type: z.literal('supplier_increase'), pct: z.number().min(1).max(100) }),
])

const PERSONAL = new Set(['purchase', 'salary_delay', 'expense_change', 'save_monthly'])
const BUSINESS = new Set(['purchase', 'hire', 'revenue_drop', 'late_payment', 'supplier_increase', 'expense_change'])

const Body = z.object({ mode: z.enum(['personal', 'business']), scenario: ScenarioSchema })

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  const { mode, scenario } = await readJson(request, Body)
  if (!(mode === 'personal' ? PERSONAL : BUSINESS).has(scenario.type)) throw new HttpError(400, `That scenario isn't available in ${mode} mode`)

  const s = await snapshot(user.id, mode)
  if (!s.rows.length) throw new HttpError(422, 'Add some transactions first so the simulator has your patterns to work from.')
  if (!s.overview.balance.asOf) throw new HttpError(422, "Your data doesn't include a balance, so we can't project your cash yet.")

  const model = buildModel({ mode, rows: s.rows, recurring: s.recurring, period: s.period, startBalanceKobo: s.overview.balance.totalKobo })
  const salary = s.recurring.find((r) => r.direction === 'credit')
  return Response.json({
    ...simulate(model, scenario as Scenario),
    context: { regularIncome: salary ? { name: salary.name, day: salary.typicalDay, amountKobo: salary.typicalAmountKobo } : null },
  })
})
