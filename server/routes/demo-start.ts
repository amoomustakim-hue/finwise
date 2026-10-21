// POST /api/demo/start — "Try it yourself": create a private, temporary demo account in one tap.
// No sign-up. Sample data only (clearly labelled). Deleted automatically after DEMO_HOURS.
// Rate-limited per network so a venue's shared Wi-Fi can still serve every judge.
import { randomBytes } from 'node:crypto'
import { hashPassword, startSession, type User } from '../auth.js'
import { db } from '../db.js'
import { addSampleTransaction, loadSampleData } from '../demo/sample.js'
import { suggestBudgets } from '../engine/finance.js'
import { loadFinance } from '../engine/load.js'
import { clientIp, handle, HttpError } from '../http.js'

const DEMO_HOURS = 24
const MAX_PER_IP = 40 // per 15 minutes
const WINDOW_MINUTES = 15

/** Delete demo accounts past their expiry (cascades to all their data). */
export async function deleteExpiredDemos(): Promise<number> {
  const rows = (await db()`delete from users where is_demo and expires_at < now() returning id`) as { id: string }[]
  return rows.length
}

async function countAndCheck(ip: string) {
  const key = `demo:${ip}`
  const rows = (await db()`
    insert into login_attempts (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when login_attempts.window_start > now() - make_interval(mins => ${WINDOW_MINUTES})
                   then login_attempts.count + 1 else 1 end,
      window_start = case when login_attempts.window_start > now() - make_interval(mins => ${WINDOW_MINUTES})
                          then login_attempts.window_start else now() end
    returning count`) as { count: number }[]
  if (rows[0].count > MAX_PER_IP) throw new HttpError(429, 'Too many demo accounts from this network. Please try again in a few minutes.')
}

export const POST = handle(async (request) => {
  await countAndCheck(clientIp(request))
  await deleteExpiredDemos()

  // An unusable random password: demo accounts can only be reached through their session cookie.
  const passwordHash = await hashPassword(randomBytes(24).toString('hex'))
  const email = `demo-${randomBytes(8).toString('hex')}@demo.finwise.invalid`
  const users = (await db()`
    insert into users (name, email, password_hash, uses_personal, uses_business, business_name, onboarded, is_demo, expires_at)
    values ('Ada Okeke', ${email}, ${passwordHash}, true, true, 'Mama Nkechi Foods', true, true, now() + make_interval(hours => ${DEMO_HOURS}))
    returning id, name, email, uses_personal, uses_business, business_name, onboarded, is_demo, expires_at`) as User[]
  const user = users[0]

  await loadSampleData(user)

  // Personal budgets from the user's own averages, with Food set a little tight so the
  // "likely to go over" state is there to explore.
  const f = await loadFinance(user.id, 'personal')
  const month = `${f.period.month}-01`
  const budgets = suggestBudgets(f.lines)
    .filter((b) => b.category !== 'Bank charges')
    .map((b) => (b.category === 'Food' ? { ...b, amountKobo: Math.round((b.amountKobo * 0.9) / 100000) * 100000 } : b))
  if (budgets.length) {
    await db().query(
      `insert into budgets (user_id, mode, category, period_month, amount_kobo)
       select $1, 'personal', c, $2::date, a from unnest($3::text[], $4::bigint[]) as t(c, a)`,
      [user.id, month, budgets.map((b) => b.category), budgets.map((b) => b.amountKobo)],
    )
  }

  // A fresh transaction waiting for an answer, so the first screen asks "What was this for?".
  await addSampleTransaction(user, 'personal', 'unknown')

  const cookie = await startSession(user.id, request, 1)
  return Response.json({ user }, { status: 201, headers: { 'Set-Cookie': cookie } })
})
