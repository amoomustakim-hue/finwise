// GET /api/pay?mode= — the account people should pay into via this user's QR (or null).
// PUT /api/pay          — set it { mode, displayName, bankName, accountNumber }.
import { z } from 'zod'
import { requireUser } from '../auth.js'
import { db } from '../db.js'
import { handle, HttpError, readJson } from '../http.js'

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  const mode = new URL(request.url).searchParams.get('mode')
  if (mode !== 'personal' && mode !== 'business') throw new HttpError(400, 'mode must be personal or business')
  const rows = await db()`
    select display_name, bank_name, account_number from pay_profiles where user_id = ${user.id} and mode = ${mode}`
  return Response.json({ profile: rows[0] ?? null })
})

const Body = z.object({
  mode: z.enum(['personal', 'business']),
  displayName: z.string().trim().min(2).max(60),
  bankName: z.string().trim().min(2).max(60),
  accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
})

export const PUT = handle(async (request) => {
  const user = await requireUser(request)
  const b = await readJson(request, Body)
  await db()`
    insert into pay_profiles (user_id, mode, display_name, bank_name, account_number)
    values (${user.id}, ${b.mode}, ${b.displayName}, ${b.bankName}, ${b.accountNumber})
    on conflict (user_id, mode) do update set display_name = excluded.display_name, bank_name = excluded.bank_name,
      account_number = excluded.account_number, updated_at = now()`
  return Response.json({ ok: true })
})
