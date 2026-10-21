// GET  /api/mono/sync — is Mono available, is it test mode, and the user's linked accounts.
// POST /api/mono/sync — refresh every Mono account the user has linked (called when the app opens).
import { requireUser } from '../../auth.js'
import { db } from '../../db.js'
import { handle } from '../../http.js'
import { monoEnabled, monoTestMode, syncMonoAccount } from '../../mono.js'

async function linked(userId: string) {
  return (await db()`
    select id, mode, bank_name, account_name, account_number_last4, mono_data_status, last_synced_at
    from accounts where user_id = ${userId} and source = 'mono' order by created_at`) as { id: string }[]
}

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  return Response.json({ enabled: monoEnabled(), testMode: monoTestMode(), accounts: await linked(user.id) })
})

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  if (!monoEnabled()) return Response.json({ enabled: false, results: [] })
  const results = []
  for (const a of await linked(user.id)) {
    try {
      results.push({ id: a.id, ...(await syncMonoAccount(a.id)) })
    } catch (err) {
      console.error('mono sync failed', a.id, err)
      results.push({ id: a.id, error: 'sync failed' })
    }
  }
  return Response.json({ enabled: true, testMode: monoTestMode(), results, accounts: await linked(user.id) })
})
