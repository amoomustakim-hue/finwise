// GET /api/health — proves the API and the database are reachable.
import { db } from '../db.js'

export async function GET(): Promise<Response> {
  try {
    const [row] = await db()`select now() as now, version() as version`
    return Response.json({ ok: true, db: 'ok', now: row.now, postgres: String(row.version).split(' ')[1] })
  } catch (err) {
    // Never leak connection details; log server-side only.
    console.error('health check failed', err)
    return Response.json({ ok: false, db: 'error' }, { status: 500 })
  }
}
