// POST /api/mono/connect { mode } — start Mono Connect; returns the hosted link URL to open.
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { requireUser } from '../../auth.js'
import { db } from '../../db.js'
import { handle, HttpError, readJson } from '../../http.js'
import { initiateLink, monoEnabled } from '../../mono.js'

const Body = z.object({ mode: z.enum(['personal', 'business']) })

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  if (!monoEnabled()) throw new HttpError(503, 'Bank connection is not available yet. Import a statement instead.')
  const { mode } = await readJson(request, Body)

  const ref = `fw_${randomBytes(9).toString('hex')}`
  await db()`insert into mono_links (ref, user_id, mode) values (${ref}, ${user.id}, ${mode})`

  const origin = new URL(request.url).origin
  const url = await initiateLink({ name: user.name, email: user.email, ref, redirectUrl: `${origin}/mono/return?ref=${ref}` })
  return Response.json({ url })
})
