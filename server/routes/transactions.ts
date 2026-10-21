// GET /api/transactions?mode=personal|business — newest first, with each row's data source.
import { requireUser } from '../auth.js'
import { db } from '../db.js'
import { handle, HttpError } from '../http.js'

export const GET = handle(async (request) => {
  const user = await requireUser(request)
  const mode = new URL(request.url).searchParams.get('mode')
  if (mode !== 'personal' && mode !== 'business') throw new HttpError(400, 'mode must be personal or business')

  const transactions = await db()`
    select t.id, t.occurred_at, t.amount_kobo::int as amount_kobo, t.direction, t.narration,
           t.balance_after_kobo::int as balance_after_kobo, t.category, t.category_status, t.kind,
           t.source, a.bank_name
    from transactions t join accounts a on a.id = t.account_id
    where t.user_id = ${user.id} and t.mode = ${mode}
    order by t.occurred_at desc, t.created_at desc
    limit 500`

  const accounts = await db()`
    select id, bank_name, source, account_name, account_number_last4
    from accounts where user_id = ${user.id} and mode = ${mode}
    order by created_at`

  return Response.json({ transactions, accounts })
})
