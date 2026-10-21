// GET /api/me   — the signed-in user (or null).
// PATCH /api/me — save onboarding choices: which modes they use and their business name.
import { z } from 'zod'
import { currentUser, requireUser, type User } from '../auth.js'
import { db } from '../db.js'
import { handle, readJson } from '../http.js'

export const GET = handle(async (request) => {
  return Response.json({ user: await currentUser(request) })
})

const Body = z
  .object({
    usesPersonal: z.boolean(),
    usesBusiness: z.boolean(),
    businessName: z.string().trim().max(80).optional(),
  })
  .refine((b) => b.usesPersonal || b.usesBusiness, { message: 'Choose Personal, Business or both' })
  .refine((b) => !b.usesBusiness || (b.businessName?.length ?? 0) >= 2, {
    message: 'Please enter your business name',
  })

export const PATCH = handle(async (request) => {
  const user = await requireUser(request)
  const body = await readJson(request, Body)
  const rows = (await db()`
    update users set
      uses_personal = ${body.usesPersonal},
      uses_business = ${body.usesBusiness},
      business_name = ${body.usesBusiness ? body.businessName! : null},
      onboarded = true
    where id = ${user.id}
    returning id, name, email, uses_personal, uses_business, business_name, onboarded`) as User[]
  return Response.json({ user: rows[0] })
})
