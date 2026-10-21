// POST   /api/demo — load (or reload) labelled sample data for each mode the user has turned on.
// DELETE /api/demo — remove all sample data (real imports are untouched).
import { requireUser } from '../auth.js'
import { categoriseWithRules } from '../categorise/engine.js'
import { db } from '../db.js'
import { businessDemo, personalDemo } from '../demo/generate.js'
import { handle } from '../http.js'
import { findOrCreateAccount, saveRows } from '../import/save.js'

const DEMO_BANK = 'FinWise Sample Bank'

async function removeDemo(userId: string) {
  // Cascades to the demo accounts' transactions.
  await db()`delete from accounts where user_id = ${userId} and source = 'demo'`
}

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  await removeDemo(user.id) // reload from scratch so it always matches today's date
  const today = new Date()
  const result: Record<string, number> = {}

  if (user.uses_personal) {
    const accountId = await findOrCreateAccount({
      userId: user.id, mode: 'personal', bankName: DEMO_BANK, source: 'demo', accountName: user.name, last4: '4821',
    })
    const rows = personalDemo({ userId: user.id, name: user.name, businessName: user.business_name, today })
    result.personal = await saveRows({ userId: user.id, accountId, mode: 'personal', source: 'demo', rows })
  }
  if (user.uses_business && user.business_name) {
    const accountId = await findOrCreateAccount({
      userId: user.id, mode: 'business', bankName: DEMO_BANK, source: 'demo', accountName: user.business_name, last4: '7310',
    })
    const rows = businessDemo({ userId: user.id, name: user.name, businessName: user.business_name, today })
    result.business = await saveRows({ userId: user.id, accountId, mode: 'business', source: 'demo', rows })
  }
  await categoriseWithRules(user.id)
  return Response.json({ loaded: result })
})

export const DELETE = handle(async (request) => {
  const user = await requireUser(request)
  await removeDemo(user.id)
  return Response.json({ ok: true })
})
