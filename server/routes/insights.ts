// GET /api/insights?mode= — up to 3 insights with evidence and an action.
// Numbers come from the engine; the AI only rewords them (and is rejected if it adds numbers).
import { requireUser } from '../auth.js'
import { buildInsights, wordInsights } from '../engine/insights.js'
import { snapshot } from '../engine/snapshot.js'
import { handle, HttpError } from '../http.js'

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  const mode = new URL(request.url).searchParams.get('mode')
  if (mode !== 'personal' && mode !== 'business') throw new HttpError(400, 'mode must be personal or business')

  const s = await snapshot(user.id, mode)
  const base = buildInsights({
    mode,
    period: s.period,
    lines: s.lines,
    recurring: s.recurring,
    indicators: s.indicators,
    projectedMonthEndKobo: s.forecast.projectedMonthEndBalanceKobo,
    incomeThisMonthKobo: s.overview.incomeKobo,
    business: s.overview.business,
  })
  const insights = await wordInsights(user.id, base)
  return Response.json({ insights })
})
