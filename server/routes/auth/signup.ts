// POST /api/auth/signup — create an account and sign in.
import { z } from 'zod'
import { hashPassword, startSession, type User } from '../../auth.js'
import { db } from '../../db.js'
import { handle, HttpError, readJson } from '../../http.js'

const Body = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
})

export const POST = handle(async (request) => {
  const { name, email, password } = await readJson(request, Body)
  const passwordHash = await hashPassword(password)

  const rows = (await db()`
    insert into users (name, email, password_hash)
    values (${name}, ${email}, ${passwordHash})
    on conflict (email) do nothing
    returning id, name, email, uses_personal, uses_business, business_name, onboarded`) as User[]
  if (!rows[0]) throw new HttpError(409, 'An account with this email already exists. Sign in instead.')

  const cookie = await startSession(rows[0].id, request)
  return Response.json({ user: rows[0] }, { status: 201, headers: { 'Set-Cookie': cookie } })
})
