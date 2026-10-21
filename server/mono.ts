// Mono Connect (bank data). Switches on when MONO_SECRET_KEY is set; test vs live is just the key.
//
// Verified in Mono docs (2026-10-21):
//   POST /v2/accounts/initiate  (header mono-sec-key) -> data.mono_url   [Connect Link guide]
//   Webhooks carry header mono-webhook-secret; event mono.events.account_updated has
//     data.account._id, data.meta.data_status, data.meta.ref              [Webhooks guide]
//   GET /v2/accounts/{id}/transactions?paginate=false; amounts in kobo   [API reference]
// NOT confirmed in the docs we could read: the "account connected" event name and the exact
// transaction field names. Parsing below accepts the likely variants; check the first real
// sandbox payload (logged by the webhook) and tighten this file.
import { db } from './db.js'
import { categoriseWithRules } from './categorise/engine.js'
import type { ParsedRow } from './import/parse-utils.js'
import { findOrCreateAccount, saveRows } from './import/save.js'

const BASE = 'https://api.withmono.com'

export const monoEnabled = () => !!process.env.MONO_SECRET_KEY
export const monoTestMode = () => (process.env.MONO_SECRET_KEY ?? '').startsWith('test_')

async function mono<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      'mono-sec-key': process.env.MONO_SECRET_KEY ?? '',
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(25_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Mono ${path} failed: HTTP ${res.status} ${JSON.stringify(data).slice(0, 300)}`)
  return data as T
}

/** Start linking: returns Mono's hosted URL. `ref` ties the result back to this user and mode. */
export async function initiateLink(opts: { name: string; email: string; ref: string; redirectUrl: string }): Promise<string> {
  const r = await mono<{ data?: { mono_url?: string } }>('/v2/accounts/initiate', {
    method: 'POST',
    body: {
      customer: { name: opts.name, email: opts.email },
      scope: 'auth',
      meta: { ref: opts.ref },
      redirect_url: opts.redirectUrl,
    },
  })
  const url = r.data?.mono_url
  if (!url) throw new Error('Mono did not return a link URL')
  return url
}

type AnyObj = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined)
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : undefined)

/** Pull account id, ref and data status out of any Mono bank-data webhook. */
export function readWebhook(payload: AnyObj): { event: string; accountId?: string; ref?: string; dataStatus?: string } {
  const data = (payload.data ?? {}) as AnyObj
  const account = (data.account ?? {}) as AnyObj
  const meta = ((data.meta ?? account.meta ?? {}) as AnyObj)
  return {
    event: str(payload.event) ?? '',
    accountId: str(account._id) ?? str(account.id) ?? str(data.id) ?? str(data._id),
    ref: str(meta.ref) ?? str(data.ref) ?? str(((data.customer ?? {}) as AnyObj).ref),
    dataStatus: str(meta.data_status) ?? str(data.data_status),
  }
}

/** Map one Mono transaction to our row shape. Returns null if essentials are missing. */
function toRow(t: AnyObj): ParsedRow | null {
  const amount = num(t.amount)
  const type = (str(t.type) ?? '').toLowerCase()
  const date = str(t.date) ?? str(t.created_at)
  if (amount === undefined || !date || (type !== 'debit' && type !== 'credit')) return null
  const balance = num(t.balance)
  return {
    date: date.slice(0, 10),
    narration: (str(t.narration) ?? str(t.description) ?? 'No description').replace(/\s+/g, ' ').trim(),
    amountKobo: Math.abs(Math.round(amount)), // Mono amounts are already in kobo
    direction: type,
    balanceKobo: balance === undefined ? undefined : Math.round(balance),
  }
}

/** Fetch details + transactions for one linked account and save them. */
export async function syncMonoAccount(accountRowId: string): Promise<{ imported: number; status: string }> {
  const rows = (await db()`
    select a.id, a.user_id, a.mode, a.mono_account_id from accounts a where a.id = ${accountRowId} and a.source = 'mono'`) as {
    id: string; user_id: string; mode: 'personal' | 'business'; mono_account_id: string
  }[]
  const acct = rows[0]
  if (!acct) throw new Error('Mono account not found')

  const details = await mono<{ data?: AnyObj }>(`/v2/accounts/${acct.mono_account_id}`)
  const d = (details.data ?? {}) as AnyObj
  const account = (d.account ?? d) as AnyObj
  const meta = (d.meta ?? {}) as AnyObj
  const status = str(meta.data_status) ?? 'UNKNOWN'
  const institution = (account.institution ?? {}) as AnyObj
  const accountNumber = str(account.account_number) ?? str(account.accountNumber)

  await db()`
    update accounts set
      bank_name = coalesce(${str(institution.name) ?? null}, bank_name),
      account_name = coalesce(${str(account.name) ?? null}, account_name),
      account_number_last4 = coalesce(${accountNumber ? accountNumber.slice(-4) : null}, account_number_last4),
      mono_data_status = ${status}
    where id = ${acct.id}`

  // Mono says to wait until data is AVAILABLE (or PARTIAL) before fetching transactions.
  if (status !== 'AVAILABLE' && status !== 'PARTIAL') return { imported: 0, status }

  const tx = await mono<{ data?: unknown }>(`/v2/accounts/${acct.mono_account_id}/transactions?paginate=false`)
  const list = (Array.isArray(tx.data) ? tx.data : ((tx.data as AnyObj | undefined)?.transactions as unknown[]) ?? []) as AnyObj[]
  const parsed = list.map(toRow).filter((r): r is ParsedRow => r !== null)
  if (list.length && !parsed.length) console.warn('Mono transactions did not match expected shape; sample:', JSON.stringify(list[0]).slice(0, 500))

  const imported = await saveRows({ userId: acct.user_id, accountId: acct.id, mode: acct.mode, source: 'mono', rows: parsed })
  await db()`update accounts set last_synced_at = now() where id = ${acct.id}`
  await categoriseWithRules(acct.user_id)
  return { imported, status }
}

/**
 * Widget flow (no webhook needed): the Connect widget's onSuccess gives the browser a temporary
 * code (valid 10 minutes); we exchange it server-side for the permanent account id.
 * Verified: POST /v2/accounts/auth { code } -> { id }   [Mono integration guide, 2026-10-21]
 */
export async function exchangeCode(code: string): Promise<string> {
  const r = await mono<{ id?: string; data?: { id?: string } }>('/v2/accounts/auth', { method: 'POST', body: { code } })
  const id = r.id ?? r.data?.id
  if (!id) throw new Error('Mono did not return an account id')
  return id
}

/** Our account row for a Mono account id, created for this user + mode if new. */
export async function attachForUser(monoAccountId: string, userId: string, mode: 'personal' | 'business'): Promise<string> {
  const existing = (await db()`select id, user_id from accounts where mono_account_id = ${monoAccountId}`) as { id: string; user_id: string }[]
  if (existing[0]) {
    if (existing[0].user_id !== userId) throw new Error('This bank account is linked to another FinWise user')
    return existing[0].id
  }
  const id = await findOrCreateAccount({ userId, mode, bankName: 'Linked bank (Mono)', source: 'mono', last4: monoAccountId.slice(-4) })
  await db()`update accounts set mono_account_id = ${monoAccountId} where id = ${id}`
  return id
}

/** Create (or find) our account row for a Mono account id, using the link ref to find the user. */
export async function attachMonoAccount(monoAccountId: string, ref: string | undefined): Promise<string | null> {
  const existing = (await db()`select id from accounts where mono_account_id = ${monoAccountId}`) as { id: string }[]
  if (existing[0]) return existing[0].id
  if (!ref) return null
  const links = (await db()`select user_id, mode from mono_links where ref = ${ref}`) as { user_id: string; mode: 'personal' | 'business' }[]
  const link = links[0]
  if (!link) return null

  const id = await findOrCreateAccount({ userId: link.user_id, mode: link.mode, bankName: 'Linked bank (Mono)', source: 'mono', last4: monoAccountId.slice(-4) })
  await db()`update accounts set mono_account_id = ${monoAccountId} where id = ${id}`
  return id
}
