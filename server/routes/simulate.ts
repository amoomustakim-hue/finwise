// POST /api/simulate — demo helper: add one new *sample* transaction dated now, so the
// "new transaction detected" confirmation flow can be shown live. Always source = 'demo'.
import { z } from 'zod'
import { requireUser } from '../auth.js'
import { categoriseWithRules } from '../categorise/engine.js'
import { db } from '../db.js'
import { handle, HttpError, readJson } from '../http.js'
import { findOrCreateAccount, insertRows } from '../import/save.js'
import { notifyNewTransactions } from '../notify.js'

const Body = z.object({
  mode: z.enum(['personal', 'business']),
  type: z.enum(['unknown', 'suggested']).default('unknown'),
})

const SAMPLES = {
  personal: {
    unknown: { narration: 'TRANSFER TO KELECHI NWANKWO', amount: 20000, direction: 'debit' },
    suggested: { narration: 'POS PURCHASE CHICKEN REPUBLIC ALLEN', amount: 8500, direction: 'debit' },
  },
  business: {
    unknown: { narration: 'TRANSFER TO IBRAHIM SALISU', amount: 15000, direction: 'debit' },
    suggested: { narration: 'TRANSFER TO ONITSHA FOODSTUFF WHOLESALE', amount: 96000, direction: 'debit' },
  },
} as const

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  const { mode, type } = await readJson(request, Body)
  if ((mode === 'personal' && !user.uses_personal) || (mode === 'business' && !user.uses_business)) {
    throw new HttpError(400, `You haven't turned on ${mode} mode`)
  }
  const sample = SAMPLES[mode][type]
  const accountId = await findOrCreateAccount({
    userId: user.id, mode, bankName: 'FinWise Sample Bank', source: 'demo',
    accountName: mode === 'business' ? (user.business_name ?? user.name) : user.name, last4: mode === 'business' ? '7310' : '4821',
  })
  // Unique narration suffix so repeated demos aren't treated as duplicates.
  const stamp = new Date()
  const ids = await insertRows({
    userId: user.id, accountId, mode, source: 'demo',
    rows: [{
      date: stamp.toISOString().slice(0, 10),
      narration: `${sample.narration} REF${stamp.getTime().toString().slice(-6)}`,
      amountKobo: sample.amount * 100,
      direction: sample.direction,
    }],
  })
  // Make it the newest item (saveRows dates rows at midday).
  await db()`
    update transactions set occurred_at = now()
    where id = (select id from transactions where account_id = ${accountId} order by created_at desc limit 1)`
  await categoriseWithRules(user.id)
  // Same alert a real new bank transaction would trigger.
  await notifyNewTransactions(user.id, ids)
  return Response.json({ ok: true })
})
