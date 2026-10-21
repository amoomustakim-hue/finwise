// POST /api/auth/login — sign in with email + password (rate limited per email and per IP).
import { z } from 'zod'
import {
  assertNotRateLimited,
  checkPassword,
  clearFailures,
  dummyCheck,
  recordFailure,
  startSession,
  type User,
} from '../../auth.js'
import { db } from '../../db.js'
import { clientIp, handle, HttpError, readJson } from '../../http.js'

const Body = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password').max(200),
})

export const POST = handle(async (request) => {
  const { email, password } = await readJson(request, Body)
  const keys = [`email:${email}`, `ip:${clientIp(request)}`]
  for (const key of keys) await assertNotRateLimited(key)

  const rows = (await db()`
    select id, name, email, uses_personal, uses_business, business_name, onboarded, is_demo, expires_at, password_hash
    from users where email = ${email}`) as (User & { password_hash: string })[]
  const found = rows[0]

  // Always run one bcrypt compare so timing doesn't reveal whether the email exists.
  const ok = found ? await checkPassword(password, found.password_hash) : await dummyCheck(password)
  if (!found || !ok) {
    for (const key of keys) await recordFailure(key)
    throw new HttpError(401, 'Email or password is incorrect')
  }

  await clearFailures(`email:${email}`)
  const { password_hash: _omit, ...user } = found
  const cookie = await startSession(user.id, request)
  return Response.json({ user }, { headers: { 'Set-Cookie': cookie } })
})
