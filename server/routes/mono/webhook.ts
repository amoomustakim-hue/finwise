// POST /api/mono/webhook — Mono bank-data events. Configure this URL and its secret in the Mono dashboard.
import { timingSafeEqual } from 'node:crypto'
import { handle, HttpError } from '../../http.js'
import { attachMonoAccount, readWebhook, syncMonoAccount } from '../../mono.js'

function secretMatches(given: string | null): boolean {
  const expected = process.env.MONO_WEBHOOK_SECRET ?? ''
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const POST = handle(async (request) => {
  if (!secretMatches(request.headers.get('mono-webhook-secret'))) throw new HttpError(401, 'Invalid webhook secret')

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const { event, accountId, ref, dataStatus } = readWebhook(payload)
  // Log shape (not contents) so the unconfirmed field names can be checked on the first real event.
  console.log('mono webhook', { event, hasAccountId: !!accountId, hasRef: !!ref, dataStatus, keys: Object.keys((payload.data ?? {}) as object) })

  if (!accountId) return Response.json({ ok: true, ignored: 'no account id' })
  const rowId = await attachMonoAccount(accountId, ref)
  if (!rowId) return Response.json({ ok: true, ignored: 'unknown account' })

  if (/reauth/i.test(event)) return Response.json({ ok: true, note: 'reauthorisation needed' })
  const result = await syncMonoAccount(rowId)
  return Response.json({ ok: true, ...result })
})
