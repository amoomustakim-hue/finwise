// POST /api/auth/logout — end the current session.
import { endSession } from '../../server/auth.js'
import { handle } from '../../server/http.js'

export const POST = handle(async (request) => {
  const cookie = await endSession(request)
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookie } })
})
