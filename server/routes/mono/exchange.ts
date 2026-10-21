// POST /api/mono/exchange { code, mode } — finish a widget link: swap the code for an account id,
// save the account under this user and mode, and import transactions if Mono has them ready.
import { z } from 'zod'
import { requireUser } from '../../auth.js'
import { handle, HttpError, readJson } from '../../http.js'
import { attachForUser, exchangeCode, monoEnabled, syncMonoAccount } from '../../mono.js'

const Body = z.object({ code: z.string().min(4).max(500), mode: z.enum(['personal', 'business']) })

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  if (!monoEnabled()) throw new HttpError(503, 'Bank connection is not available')
  const { code, mode } = await readJson(request, Body)
  if ((mode === 'personal' && !user.uses_personal) || (mode === 'business' && !user.uses_business)) {
    throw new HttpError(400, `You haven't turned on ${mode} mode`)
  }

  let monoId: string
  try {
    monoId = await exchangeCode(code)
  } catch (err) {
    console.error('mono exchange failed', err)
    throw new HttpError(502, 'Mono could not confirm the link. Please try connecting again.')
  }
  const accountId = await attachForUser(monoId, user.id, mode).catch((e: Error) => {
    throw new HttpError(409, e.message)
  })
  // Mono may still be fetching the bank's data; the return page keeps polling /api/mono/sync.
  const result = await syncMonoAccount(accountId).catch((err) => {
    console.error('first mono sync failed', err)
    return { imported: 0, status: 'PROCESSING' }
  })
  return Response.json({ ok: true, ...result })
})
