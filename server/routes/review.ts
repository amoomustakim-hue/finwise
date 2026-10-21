// GET  /api/review?mode=  — transactions that need the user: unanswered ones first, then suggestions to confirm.
// POST /api/review        — confirm or change a category; optionally remember it for that merchant/person.
import { z } from 'zod'
import { categoriesFor, isValidCategory, kindOf, type Mode } from '../../shared/categories.js'
import { requireUser } from '../auth.js'
import { applyRules } from '../categorise/rules.js'
import { db } from '../db.js'
import { handle, HttpError, readJson } from '../http.js'

type Row = {
  id: string
  occurred_at: string
  amount_kobo: number
  direction: 'debit' | 'credit'
  narration: string
  category: string | null
  category_status: 'pending' | 'suggested'
  category_confidence: number | null
  category_source: string | null
  match_key: string | null
  source: string
}

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  const mode = new URL(request.url).searchParams.get('mode')
  if (mode !== 'personal' && mode !== 'business') throw new HttpError(400, 'mode must be personal or business')

  const rows = (await db()`
    select id, occurred_at, amount_kobo::int as amount_kobo, direction, narration, category, category_status,
           category_confidence, category_source, match_key, source
    from transactions
    where user_id = ${user.id} and mode = ${mode} and category_status <> 'confirmed'
    order by (category_status = 'pending') desc, occurred_at desc
    limit 200`) as Row[]

  const counts = (await db()`
    select count(*) filter (where category_status = 'pending')::int as pending,
           count(*) filter (where category_status = 'suggested')::int as suggested,
           count(*) filter (where category_status = 'suggested' and category_source = 'rule'
                            and category_confidence >= ${BULK_MIN_CONFIDENCE})::int as bulk_confirmable
    from transactions where user_id = ${user.id} and mode = ${mode}`) as { pending: number; suggested: number; bulk_confirmable: number }[]

  const names = [user.name, user.business_name ?? ''].filter(Boolean)
  return Response.json({
    counts: counts[0],
    items: rows.map((r) => {
      const rule = applyRules({ narration: r.narration, direction: r.direction, mode }, names)
      return {
        ...r,
        question:
          r.category_status === 'suggested'
            ? `Is this ${r.category}?`
            : mode === 'business' && r.direction === 'credit' && r.match_key?.startsWith('FROM:')
              ? `This is much bigger than your usual sales. Was it a customer payment, or something else (a loan, refund or your own money)?`
              : rule && 'ask' in rule
              ? rule.ask
              : `₦${(r.amount_kobo / 100).toLocaleString('en-NG')} ${r.direction === 'debit' ? 'left' : 'came into'} your account. What was it ${r.direction === 'debit' ? 'used for' : ''}?`.replace(' ?', '?'),
        options: categoriesFor(mode, r.direction),
      }
    }),
  })
})

const Body = z.union([
  z.object({ id: z.string().uuid(), category: z.string().min(1), remember: z.boolean().default(false) }),
  // Accept every keyword-rule suggestion at or above this confidence in one tap (avoids alert fatigue).
  z.object({ confirmAll: z.literal(true), mode: z.enum(['personal', 'business']) }),
])

/** Rule suggestions this confident can be bulk-confirmed; AI suggestions are always reviewed one by one. */
const BULK_MIN_CONFIDENCE = 0.85

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  const body = await readJson(request, Body)

  if ('confirmAll' in body) {
    const done = (await db()`
      update transactions set category_status = 'confirmed'
      where user_id = ${user.id} and mode = ${body.mode} and category_status = 'suggested'
        and category_source = 'rule' and category_confidence >= ${BULK_MIN_CONFIDENCE}
      returning id`) as { id: string }[]
    return Response.json({ ok: true, confirmed: done.length })
  }

  const found = (await db()`
    select id, mode, direction, match_key from transactions where id = ${body.id} and user_id = ${user.id}`) as {
    id: string; mode: Mode; direction: 'debit' | 'credit'; match_key: string | null
  }[]
  const tx = found[0]
  if (!tx) throw new HttpError(404, 'Transaction not found')
  if (!isValidCategory(tx.mode, body.category, tx.direction)) throw new HttpError(400, 'That category does not fit this transaction')

  const kind = kindOf(tx.mode, body.category)
  await db()`
    update transactions set category = ${body.category}, kind = ${kind}, category_status = 'confirmed',
      category_confidence = 1, category_source = 'user'
    where id = ${tx.id}`

  let alsoUpdated = 0
  if (body.remember && tx.match_key) {
    await db()`
      insert into category_rules (user_id, mode, match_key, category)
      values (${user.id}, ${tx.mode}, ${tx.match_key}, ${body.category})
      on conflict (user_id, mode, match_key) do update set category = excluded.category`
    // Apply to other unconfirmed transactions with the same merchant/person and direction.
    const updated = (await db()`
      update transactions set category = ${body.category}, kind = ${kind}, category_status = 'confirmed',
        category_confidence = 1, category_source = 'user_rule'
      where user_id = ${user.id} and mode = ${tx.mode} and match_key = ${tx.match_key}
        and direction = ${tx.direction} and category_status <> 'confirmed'
      returning id`) as { id: string }[]
    alsoUpdated = updated.length
  }
  return Response.json({ ok: true, alsoUpdated })
})
