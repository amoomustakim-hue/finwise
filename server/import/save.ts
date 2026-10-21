// Saves parsed rows for one account. Duplicate rows (re-imports, overlapping statements) are skipped.
import { createHash } from 'node:crypto'
import { db } from '../db.js'
import type { ParsedRow } from './parse-utils.js'

type Mode = 'personal' | 'business'
type Source = 'import' | 'demo' | 'mono'

/** Find the user's account for this bank/mode/source, or create it. */
export async function findOrCreateAccount(opts: {
  userId: string
  mode: Mode
  bankName: string
  source: Source
  accountName?: string
  last4?: string
}): Promise<string> {
  const existing = (await db()`
    select id from accounts
    where user_id = ${opts.userId} and mode = ${opts.mode} and bank_name = ${opts.bankName}
      and source = ${opts.source} and coalesce(account_number_last4, '') = ${opts.last4 ?? ''}
    limit 1`) as { id: string }[]
  if (existing[0]) return existing[0].id

  const created = (await db()`
    insert into accounts (user_id, mode, bank_name, account_name, account_number_last4, source)
    values (${opts.userId}, ${opts.mode}, ${opts.bankName}, ${opts.accountName ?? null}, ${opts.last4 ?? null}, ${opts.source})
    returning id`) as { id: string }[]
  return created[0].id
}

/**
 * Stable key for a row. Includes the running balance when present, so two genuinely identical
 * purchases on the same day stay separate; without a balance, the occurrence number does that.
 */
function dedupeKey(accountId: string, row: ParsedRow, occurrence: number): string {
  const narration = row.narration.toLowerCase().replace(/[^a-z0-9]/g, '')
  const parts = [accountId, row.date, row.direction, row.amountKobo, narration, row.balanceKobo ?? `#${occurrence}`]
  return createHash('sha256').update(parts.join('|')).digest('hex')
}

/** Insert rows in one statement. Returns how many were new. */
export async function saveRows(opts: {
  userId: string
  accountId: string
  mode: Mode
  source: Source
  rows: ParsedRow[]
}): Promise<number> {
  if (!opts.rows.length) return 0
  const seen = new Map<string, number>()
  const keys = opts.rows.map((r) => {
    const base = `${r.date}|${r.direction}|${r.amountKobo}|${r.narration}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return dedupeKey(opts.accountId, r, n)
  })

  const inserted = (await db().query(
    `insert into transactions
       (user_id, account_id, mode, source, dedupe_key, occurred_at, amount_kobo, direction, narration, balance_after_kobo)
     select $1, $2, $3, $4, k, (d || 'T12:00:00+01:00')::timestamptz, a, dir, n, b
     from unnest($5::text[], $6::text[], $7::bigint[], $8::text[], $9::text[], $10::bigint[]) as t(k, d, a, dir, n, b)
     on conflict (user_id, dedupe_key) do nothing
     returning id`,
    [
      opts.userId,
      opts.accountId,
      opts.mode,
      opts.source,
      keys,
      opts.rows.map((r) => r.date),
      opts.rows.map((r) => r.amountKobo),
      opts.rows.map((r) => r.direction),
      opts.rows.map((r) => r.narration),
      opts.rows.map((r) => r.balanceKobo ?? null),
    ],
  )) as { id: string }[]
  return inserted.length
}
