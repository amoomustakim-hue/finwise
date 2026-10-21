// POST /api/categorise — run rules, then a bounded AI pass on unknown merchants.
// The front end calls this after imports and when Home opens; it's safe to call repeatedly.
import { requireUser } from '../server/auth.js'
import { categoriseWithAi, categoriseWithRules } from '../server/categorise/engine.js'
import { handle } from '../server/http.js'

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  const rules = await categoriseWithRules(user.id)
  const ai = await categoriseWithAi(user.id)
  return Response.json({ ...rules, ...ai })
})
