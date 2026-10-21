// POST   /api/demo — load (or reload) labelled sample data for each mode the user has turned on.
// DELETE /api/demo — remove all sample data (real imports are untouched).
import { requireUser } from '../auth.js'
import { loadSampleData, removeSampleData } from '../demo/sample.js'
import { handle } from '../http.js'

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  return Response.json({ loaded: await loadSampleData(user) })
})

export const DELETE = handle(async (request) => {
  const user = await requireUser(request)
  await removeSampleData(user.id)
  return Response.json({ ok: true })
})
