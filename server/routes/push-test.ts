// POST /api/push/test — send a test notification to this user's devices.
import { requireUser } from '../auth.js'
import { handle } from '../http.js'
import { sendToUser } from '../notify.js'

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  const r = await sendToUser(user.id, {
    title: 'FinWise alerts are on',
    body: "We'll tell you when new money moves in your account, and ask what it was for.",
    url: '/home',
    tag: 'test',
  })
  return Response.json(r)
})
