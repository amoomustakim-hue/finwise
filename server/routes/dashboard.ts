// GET /api/dashboard?mode= — overview, budgets, upcoming payments and indicators for this month.
// Every number comes from server/engine (deterministic, traceable).
import { requireUser } from '../auth.js'
import { snapshot } from '../engine/snapshot.js'
import { handle, HttpError } from '../http.js'

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  const mode = new URL(request.url).searchParams.get('mode')
  if (mode !== 'personal' && mode !== 'business') throw new HttpError(400, 'mode must be personal or business')

  const s = await snapshot(user.id, mode)
  return Response.json({
    mode,
    period: s.period,
    overview: s.overview,
    forecast: s.forecast,
    categories: s.lines,
    hasBudgets: s.hasBudgets,
    recurring: s.recurring,
    indicators: s.indicators,
  })
})
