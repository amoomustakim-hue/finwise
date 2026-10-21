// Categorisation pipeline for a user's uncategorised transactions:
//   1. the user's own remembered rules  -> confirmed
//   2. keyword rules                    -> suggested (high confidence) or "ask the user"
//   3. AI for unknown merchants         -> suggested if confident, else left pending
// Transfers to people are never guessed (step 2 marks them "ask").
import { z } from 'zod'
import { categoriesFor, kindOf, type Mode } from '../../shared/categories.js'
import { db } from '../db.js'
import { llmJson, LlmUnavailable } from '../llm.js'
import { applyRules, matchKey } from './rules.js'

type Row = { id: string; mode: Mode; direction: 'debit' | 'credit'; narration: string }

const AI_MIN_CONFIDENCE = 0.7
const AI_BATCH = 40 // distinct narrations per AI call (keeps well under the 8K tokens/min free tier)

/** Steps 1–2 for everything not yet categorised. Fast and free; run after every import/sync. */
export async function categoriseWithRules(userId: string): Promise<{ ruled: number; userRuled: number }> {
  const users = (await db()`select name, business_name from users where id = ${userId}`) as { name: string; business_name: string | null }[]
  const ownNames = [users[0]?.name, users[0]?.business_name].filter((n): n is string => !!n)

  const rows = (await db()`
    select id, mode, direction, narration from transactions
    where user_id = ${userId} and category is null and category_source is null`) as Row[]
  if (!rows.length) return { ruled: 0, userRuled: 0 }

  const userRules = (await db()`select mode, match_key, category from category_rules where user_id = ${userId}`) as {
    mode: Mode; match_key: string; category: string
  }[]
  const remembered = new Map(userRules.map((r) => [`${r.mode}|${r.match_key}`, r.category]))

  const updates: { id: string; key: string; category: string | null; status: string; confidence: number | null; source: string | null }[] = []
  let userRuled = 0
  let ruled = 0

  for (const tx of rows) {
    const key = matchKey(tx.narration)
    const mine = remembered.get(`${tx.mode}|${key}`)
    if (mine && categoriesFor(tx.mode, tx.direction).includes(mine)) {
      updates.push({ id: tx.id, key, category: mine, status: 'confirmed', confidence: 1, source: 'user_rule' })
      userRuled++
      continue
    }
    const r = applyRules(tx, ownNames)
    if (r && 'category' in r) {
      updates.push({ id: tx.id, key, category: r.category, status: 'suggested', confidence: r.confidence, source: 'rule' })
      ruled++
    } else {
      // "ask" or unknown: stays pending; just record the match key. AI may try unknowns later.
      updates.push({ id: tx.id, key, category: null, status: 'pending', confidence: null, source: null })
    }
  }

  await applyUpdates(updates)
  // Transfers to people should go to the user, not the AI.
  await db()`
    update transactions set ai_tried = true
    where user_id = ${userId} and category is null and match_key ~ '^(TO|FROM):'`
  await flagUnusualCredits(userId)
  return { ruled, userRuled }
}

/**
 * Business credits from people are assumed to be sales, but an unusually large one may be a loan,
 * a refund or the owner's own money. Ask instead of counting it as a sale:
 * anything over 5x the typical (median) customer payment and at least ₦100,000.
 * Marked category_source = 'rule' with no category, so the rules pass won't re-suggest it.
 */
async function flagUnusualCredits(userId: string) {
  await db()`
    with typical as (
      select percentile_cont(0.5) within group (order by amount_kobo) as median
      from transactions
      where user_id = ${userId} and mode = 'business' and category = 'Customer payment'
    )
    update transactions t set category = null, kind = null, category_status = 'pending',
      category_confidence = null, category_source = 'rule', ai_tried = true
    from typical
    where t.user_id = ${userId} and t.mode = 'business' and t.category = 'Customer payment'
      and t.category_status = 'suggested' and t.category_source = 'rule' and t.match_key like 'FROM:%'
      and t.amount_kobo > greatest(typical.median * 5, 10000000)`
}

/** Step 3: AI for unknown merchants. Bounded so one request stays fast; call again for more. */
export async function categoriseWithAi(userId: string, maxBatches = 2): Promise<{ suggested: number; tried: number; aiAvailable: boolean }> {
  let suggested = 0
  let tried = 0
  for (let batch = 0; batch < maxBatches; batch++) {
    const rows = (await db()`
      select id, mode, direction, narration, match_key from transactions
      where user_id = ${userId} and category is null and not ai_tried
      order by occurred_at desc limit 400`) as (Row & { match_key: string })[]
    if (!rows.length) break

    // One AI decision per distinct (mode, direction, merchant key).
    const groups = new Map<string, (Row & { match_key: string })[]>()
    for (const r of rows) {
      const g = `${r.mode}|${r.direction}|${r.match_key}`
      groups.set(g, [...(groups.get(g) ?? []), r])
    }
    const items = [...groups.values()].slice(0, AI_BATCH).map((g, i) => ({ i, ...g[0] }))

    let answers: { i: number; category?: string | null; confidence: number }[]
    try {
      answers = await askAi(items)
    } catch (err) {
      if (err instanceof LlmUnavailable) return { suggested, tried, aiAvailable: false }
      throw err
    }

    const updates = []
    const triedIds: string[] = []
    for (const item of items) {
      const members = groups.get(`${item.mode}|${item.direction}|${item.match_key}`)!
      triedIds.push(...members.map((m) => m.id))
      const a = answers.find((x) => x.i === item.i)
      if (!a?.category || a.confidence < AI_MIN_CONFIDENCE) continue
      if (!categoriesFor(item.mode, item.direction).includes(a.category)) continue
      for (const m of members) {
        updates.push({ id: m.id, key: m.match_key, category: a.category, status: 'suggested', confidence: a.confidence, source: 'ai' })
      }
    }
    await applyUpdates(updates)
    await db()`update transactions set ai_tried = true where id = any(${triedIds}::uuid[])`
    suggested += updates.length
    tried += triedIds.length
  }
  return { suggested, tried, aiAvailable: true }
}

const AiAnswer = z.object({
  results: z.array(z.object({ i: z.number().int(), category: z.string().nullable(), confidence: z.number().min(0).max(1) })),
})

async function askAi(items: (Row & { i: number })[]) {
  // Only the narration text and direction are sent: no names of the user, balances or account numbers.
  const allowed = {
    personal: { debit: categoriesFor('personal', 'debit'), credit: categoriesFor('personal', 'credit') },
    business: { debit: categoriesFor('business', 'debit'), credit: categoriesFor('business', 'credit') },
  }
  const r = await llmJson({
    system:
      'You categorise Nigerian bank transaction narrations. For each item pick ONE category from the allowed list ' +
      'for its mode and direction, or null if the narration does not make the purpose clear. Never guess the purpose ' +
      'of a transfer to or from a person. If the narration is only a generic business name that does not reveal what ' +
      'was bought (e.g. "XYZ VENTURES", "ABC ENTERPRISES", "GLOBAL CONCEPTS"), return null. ' +
      'Confidence must reflect how certain the narration makes the category. ' +
      'Reply as JSON: {"results":[{"i":0,"category":"Food","confidence":0.8}]}. ' +
      `Allowed categories: ${JSON.stringify(allowed)}`,
    user: JSON.stringify(items.map((x) => ({ i: x.i, mode: x.mode, direction: x.direction, narration: x.narration }))),
    schema: AiAnswer,
    maxTokens: 2500,
    timeoutMs: 25_000,
  })
  return r.results
}

/** Write category decisions in one statement. */
async function applyUpdates(
  updates: { id: string; key: string; category: string | null; status: string; confidence: number | null; source: string | null }[],
) {
  if (!updates.length) return
  await db().query(
    `update transactions t set
       match_key = u.key,
       category = u.category,
       category_status = u.status,
       category_confidence = u.confidence,
       category_source = u.source,
       kind = u.kind
     from unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::real[], $6::text[], $7::text[])
       as u(id, key, category, status, confidence, source, kind)
     where t.id = u.id`,
    [
      updates.map((u) => u.id),
      updates.map((u) => u.key),
      updates.map((u) => u.category),
      updates.map((u) => u.status),
      updates.map((u) => u.confidence),
      updates.map((u) => u.source),
      // kind needs the mode; look it up per row via the category list (null when uncategorised)
      await kindsFor(updates),
    ],
  )
}

async function kindsFor(updates: { id: string; category: string | null }[]): Promise<(string | null)[]> {
  const modes = (await db()`select id, mode from transactions where id = any(${updates.map((u) => u.id)}::uuid[])`) as { id: string; mode: Mode }[]
  const modeOf = new Map(modes.map((m) => [m.id, m.mode]))
  return updates.map((u) => (u.category ? kindOf(modeOf.get(u.id)!, u.category) : null))
}
