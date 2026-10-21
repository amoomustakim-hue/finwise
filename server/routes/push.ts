// GET    /api/push — the public key browsers need to subscribe, and whether this user has devices.
// POST   /api/push — save this browser's push subscription.
// DELETE /api/push — remove it (user turned alerts off).
import { z } from 'zod'
import { requireUser } from '../auth.js'
import { db } from '../db.js'
import { handle, HttpError, readJson } from '../http.js'
import { pushPublicKey } from '../notify.js'

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  const rows = (await db()`select count(*)::int as n from push_subscriptions where user_id = ${user.id}`) as { n: number }[]
  return Response.json({ publicKey: pushPublicKey(), devices: rows[0].n })
})

const Sub = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
})

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  if (!pushPublicKey()) throw new HttpError(503, 'Notifications are not set up on the server')
  const s = await readJson(request, Sub)
  await db()`
    insert into push_subscriptions (user_id, endpoint, p256dh, auth)
    values (${user.id}, ${s.endpoint}, ${s.keys.p256dh}, ${s.keys.auth})
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`
  return Response.json({ ok: true })
})

export const DELETE = handle(async (request) => {
  const user = await requireUser(request)
  const { endpoint } = await readJson(request, z.object({ endpoint: z.string().url() }))
  await db()`delete from push_subscriptions where user_id = ${user.id} and endpoint = ${endpoint}`
  return Response.json({ ok: true })
})
