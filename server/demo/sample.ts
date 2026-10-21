// Loading labelled sample data and adding single sample transactions. Shared by the
// "Load sample data" button, the demo-tools buttons and "Try it yourself" accounts.
import type { User } from '../auth.js'
import { categoriseWithRules } from '../categorise/engine.js'
import { db } from '../db.js'
import { findOrCreateAccount, insertRows, saveRows } from '../import/save.js'
import { businessDemo, personalDemo } from './generate.js'

const DEMO_BANK = 'FinWise Sample Bank'
type Mode = 'personal' | 'business'

const sampleAccount = (user: User, mode: Mode) =>
  findOrCreateAccount({
    userId: user.id, mode, bankName: DEMO_BANK, source: 'demo',
    accountName: mode === 'business' ? (user.business_name ?? user.name) : user.name,
    last4: mode === 'business' ? '7310' : '4821',
  })

/** Remove all sample data (cascades to its transactions); real imports are untouched. */
export async function removeSampleData(userId: string) {
  await db()`delete from accounts where user_id = ${userId} and source = 'demo'`
}

/** (Re)load sample history for each mode the user has turned on, up to today. */
export async function loadSampleData(user: User): Promise<Record<string, number>> {
  await removeSampleData(user.id) // reload from scratch so it always matches today's date
  const today = new Date()
  const result: Record<string, number> = {}
  if (user.uses_personal) {
    const rows = personalDemo({ userId: user.id, name: user.name, businessName: user.business_name, today })
    result.personal = await saveRows({ userId: user.id, accountId: await sampleAccount(user, 'personal'), mode: 'personal', source: 'demo', rows })
  }
  if (user.uses_business && user.business_name) {
    const rows = businessDemo({ userId: user.id, name: user.name, businessName: user.business_name, today })
    result.business = await saveRows({ userId: user.id, accountId: await sampleAccount(user, 'business'), mode: 'business', source: 'demo', rows })
  }
  await categoriseWithRules(user.id)
  return result
}

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

/** Add one sample transaction dated now (for the "new transaction detected" flow). Returns new ids. */
export async function addSampleTransaction(user: User, mode: Mode, type: 'unknown' | 'suggested'): Promise<string[]> {
  const sample = SAMPLES[mode][type]
  const accountId = await sampleAccount(user, mode)
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
  // Make it the newest item (rows are otherwise dated at midday).
  if (ids.length) await db()`update transactions set occurred_at = now() where id = any(${ids}::uuid[])`
  await categoriseWithRules(user.id)
  return ids
}
