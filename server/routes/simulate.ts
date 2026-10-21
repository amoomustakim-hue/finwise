// POST /api/simulate — demo helper: add one new *sample* transaction dated now, so the
// "new transaction detected" confirmation flow (and its push alert) can be shown live.
import { z } from 'zod'
import { requireUser } from '../auth.js'
import { addSampleTransaction } from '../demo/sample.js'
import { handle, HttpError, readJson } from '../http.js'
import { notifyNewTransactions } from '../notify.js'

const Body = z.object({
  mode: z.enum(['personal', 'business']),
  type: z.enum(['unknown', 'suggested']).default('unknown'),
})

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  const { mode, type } = await readJson(request, Body)
  if ((mode === 'personal' && !user.uses_personal) || (mode === 'business' && !user.uses_business)) {
    throw new HttpError(400, `You haven't turned on ${mode} mode`)
  }
  const ids = await addSampleTransaction(user, mode, type)
  // Same alert a real new bank transaction would trigger.
  await notifyNewTransactions(user.id, ids)
  return Response.json({ ok: true })
})
