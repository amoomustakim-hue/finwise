// GET|POST /api/jobs/sync — scheduled check of every linked bank account for new transactions;
// new ones trigger push notifications (see syncMonoAccount). Protected by CRON_SECRET:
// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically; an external scheduler
// (e.g. cron-job.org, for checks every few minutes) must send the same header.
import { timingSafeEqual } from 'node:crypto'
import { db } from '../db.js'
import { handle, HttpError } from '../http.js'
import { monoEnabled, syncMonoAccount } from '../mono.js'

const TIME_BUDGET_MS = 50_000 // stay inside the function time limit; the next run continues

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function run(request: Request): Promise<Response> {
  if (!authorised(request)) throw new HttpError(401, 'Unauthorised')
  if (!monoEnabled()) return Response.json({ ok: true, skipped: 'mono not configured' })

  const started = Date.now()
  // Least recently synced first, so every account gets a turn across runs.
  const accounts = (await db()`
    select id from accounts where source = 'mono' and mono_account_id is not null
    order by last_synced_at asc nulls first limit 200`) as { id: string }[]
  let checked = 0
  let newTransactions = 0
  for (const a of accounts) {
    if (Date.now() - started > TIME_BUDGET_MS) break
    try {
      const r = await syncMonoAccount(a.id)
      newTransactions += r.imported
    } catch (err) {
      console.error('scheduled sync failed', a.id, err)
    }
    checked++
  }
  return Response.json({ ok: true, checked, of: accounts.length, newTransactions })
}

export const GET = handle(run)
export const POST = handle(run)
