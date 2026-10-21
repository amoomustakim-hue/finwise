// Web Push: tell the user's devices about new transactions, with the same question the app asks
// ("What was this for?" / "Is this Food?"). Tapping the notification opens FinWise on that card.
import webpush from 'web-push'
import { db } from './db.js'

let configured = false
function configure(): boolean {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  // The subject is a contact for the push service; our site URL (no personal email needed).
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'https://finwise-theta-one.vercel.app', pub, priv)
  configured = true
  return true
}

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null

type Payload = { title: string; body: string; url: string; tag: string }

/** Send to every device the user has subscribed; drop subscriptions the push service says are gone. */
export async function sendToUser(userId: string, payload: Payload): Promise<{ sent: number; failed: number }> {
  if (!configure()) return { sent: 0, failed: 0 }
  const subs = (await db()`select id, endpoint, p256dh, auth from push_subscriptions where user_id = ${userId}`) as {
    id: string; endpoint: string; p256dh: string; auth: string
  }[]
  let sent = 0
  let failed = 0
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 })
        sent++
      } catch (err) {
        failed++
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await db()`delete from push_subscriptions where id = ${s.id}`
        else console.error('push failed', code)
      }
    }),
  )
  return { sent, failed }
}

const naira = (k: number) => `₦${Math.round(k / 100).toLocaleString('en-NG')}`

/** One notification for new transactions: a specific question for one, a summary for several. */
export async function notifyNewTransactions(userId: string, ids: string[]) {
  if (!ids.length) return
  const rows = (await db()`
    select id, amount_kobo::int as amount_kobo, direction, narration, category, category_status, mode
    from transactions where id = any(${ids}::uuid[]) order by occurred_at desc`) as {
    id: string; amount_kobo: number; direction: 'debit' | 'credit'; narration: string; category: string | null
    category_status: string; mode: string
  }[]
  if (!rows.length) return

  if (rows.length === 1) {
    const t = rows[0]
    const what = `${naira(t.amount_kobo)} ${t.direction === 'debit' ? 'debited' : 'received'}`
    await sendToUser(userId, {
      title: t.category_status === 'pending' ? `${what}: what was it for?` : `${what}: is this ${t.category}?`,
      body: t.narration,
      url: '/home',
      tag: `tx-${t.id}`,
    })
    return
  }
  const pending = rows.filter((r) => r.category_status === 'pending').length
  await sendToUser(userId, {
    title: `${rows.length} new transactions`,
    body: pending ? `${pending} need a quick answer so your budgets stay right.` : 'Tap to review them.',
    url: '/review',
    tag: 'tx-batch',
  })
}
