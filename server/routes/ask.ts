// POST /api/ask { mode, question } — "Ask FinWise": a plain-language answer from the user's own data.
import { z } from 'zod'
import { requireUser } from '../auth.js'
import { ask } from '../engine/ask.js'
import { handle, readJson } from '../http.js'

const Body = z.object({
  mode: z.enum(['personal', 'business']),
  question: z.string().trim().min(2, 'Type a question').max(300, 'Please keep it under 300 characters'),
})

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  const { mode, question } = await readJson(request, Body)
  const answer = await ask(user.id, question, mode, { usesBusiness: user.uses_business })
  return Response.json(answer)
})
