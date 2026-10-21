// Synthetic, clearly-labelled sample data for demos (source = 'demo').
// Deterministic per user (seeded), so the same user always gets the same history.
// Patterns are planted on purpose so insights have something real to find:
//  - Personal: food spending ~25% higher this month; a forgotten small subscription; transfers to people
//    that need the user to say what they were for; monthly savings move to own account (internal).
//  - Business: Saturdays bring ~2x weekday sales; supplier (restock) prices rising ~10% this month;
//    weekly owner's pay to the personal account (internal transfer).
import type { ParsedRow } from '../import/parse-utils.js'

/** Small seeded PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
  }
}

const seedFrom = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)
const naira = (n: number) => Math.round(n) * 100 // whole naira -> kobo
const round = (n: number, to: number) => Math.round(n / to) * to

type Event = { date: string; narration: string; amount: number; direction: 'credit' | 'debit' } // amount in naira

/** Days from the 1st of the month three months back, up to and including today. */
function days(today: Date): Date[] {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 3, 1))
  const out: Date[] = []
  for (let d = start; d <= today; d = new Date(d.getTime() + 86400000)) out.push(d)
  return out
}
const iso = (d: Date) => d.toISOString().slice(0, 10)
const isThisMonth = (d: Date, today: Date) =>
  d.getUTCMonth() === today.getUTCMonth() && d.getUTCFullYear() === today.getUTCFullYear()
const monthName = (d: Date) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase()

/** Apply events in order, computing running balances; skip debits that would overdraw. */
function toRows(events: Event[], opening: number): ParsedRow[] {
  let balance = opening
  const rows: ParsedRow[] = []
  for (const e of events.sort((a, b) => a.date.localeCompare(b.date))) {
    if (e.direction === 'debit' && balance - e.amount < 2000) continue
    balance += e.direction === 'credit' ? e.amount : -e.amount
    rows.push({ date: e.date, narration: e.narration, amountKobo: naira(e.amount), direction: e.direction, balanceKobo: naira(balance) })
  }
  return rows
}

/** Bank charges that follow money movements (Nigerian stamp duty on credits ≥ ₦10,000, transfer fees). */
function withCharges(events: Event[]): Event[] {
  const out: Event[] = []
  for (const e of events) {
    out.push(e)
    if (e.direction === 'credit' && e.amount >= 10000) out.push({ date: e.date, narration: 'ELECTRONIC MONEY TRANSFER LEVY', amount: 50, direction: 'debit' })
    if (e.direction === 'debit' && /^TRANSFER TO/.test(e.narration)) {
      out.push({ date: e.date, narration: 'NIP TRANSFER CHARGE', amount: e.amount > 50000 ? 50 : e.amount > 5000 ? 25 : 10, direction: 'debit' })
    }
  }
  return out
}

export function personalDemo(opts: { userId: string; name: string; businessName?: string | null; today: Date }): ParsedRow[] {
  const r = rng(seedFrom(`${opts.userId}:personal`))
  const first = opts.name.split(' ')[0].toUpperCase()
  const ev: Event[] = []
  const add = (d: Date, narration: string, amount: number, direction: Event['direction'] = 'debit') =>
    ev.push({ date: iso(d), narration, amount, direction })

  for (const d of days(opts.today)) {
    const dom = d.getUTCDate()
    const dow = d.getUTCDay() // 0 Sun .. 6 Sat
    const thisMonth = isThisMonth(d, opts.today)

    if (dom === 25) add(d, `SALARY ${monthName(d)} - BRIGHTWAY LOGISTICS LTD`, opts.businessName ? 380000 : 460000, 'credit') // no owner's pay without a business
    if (dom === 26) add(d, `TRANSFER TO OWN ACCOUNT - ${first} SAVINGS`, 40000)
    if (dom === 27) add(d, 'TRANSFER TO MUMMY ADAEZE', 25000)
    if (dom === 3) add(d, 'DSTV SUBSCRIPTION COMPACT', 19000)
    if (dom === 12) add(d, 'NETFLIX.COM SUBSCRIPTION', 7500)
    if (dom === 17) add(d, 'APPLE.COM/BILL ICLOUD STORAGE', 1500) // small, easy to forget
    if (dom === 5 || dom === 20) add(d, 'IKEDC PREPAID TOKEN', round(r.int(12000, 18000), 500))
    if (dom === 1) add(d, 'SMS ALERT CHARGES', 200)
    if (opts.businessName && dow === 5) add(d, `TRANSFER FROM ${opts.businessName.toUpperCase()} - OWNER PAY`, 20000, 'credit')

    // Food: regular Mon/Wed/Fri/Sat habit (~₦60k a month), ~25% pricier this month
    // (the planted "food is up" insight).
    if (dow === 1 || dow === 3 || dow === 5 || dow === 6) {
      const place = r.pick(['CHICKEN REPUBLIC', 'KILIMANJARO RESTAURANT', 'DOMINOS PIZZA', 'MAMA PUT BUKKA', 'CHOWDECK ORDER'] as const)
      add(d, `POS PURCHASE ${place}`, round(r.int(2500, 4500) * (thisMonth ? 1.25 : 1), 50))
    }
    if (dow === 6) add(d, `POS PURCHASE ${r.pick(['SHOPRITE LEKKI', 'MARKET SQUARE', 'SPAR ADMIRALTY'] as const)}`, round(r.int(14000, 26000), 100))
    if (dow >= 1 && dow <= 5 && r.chance(0.7)) add(d, `${r.pick(['BOLT', 'UBER'] as const)} TRIP`, round(r.int(1500, 4800), 50))
    if (r.chance(0.18)) add(d, `MTN ${r.pick(['AIRTIME', 'DATA BUNDLE'] as const)} PURCHASE`, r.pick([1000, 1500, 2000, 3000, 5000] as const))
    if (r.chance(0.06)) add(d, `TRANSFER TO ${r.pick(['CHINEDU OKAFOR', 'TUNDE BAKARE', 'BLESSING OKON'] as const)}`, round(r.int(5000, 30000), 500))
    if (r.chance(0.04)) add(d, `POS PURCHASE ${r.pick(['JUMIA ONLINE', 'SLOT SYSTEMS', 'H&M IKEJA CITY MALL'] as const)}`, round(r.int(8000, 45000), 500))
    if (r.chance(0.02)) add(d, 'POS PURCHASE MEDPLUS PHARMACY', round(r.int(3000, 12000), 100))
  }
  return toRows(withCharges(ev), 240000)
}

export function businessDemo(opts: { userId: string; name: string; businessName: string; today: Date }): ParsedRow[] {
  const r = rng(seedFrom(`${opts.userId}:business`))
  const ev: Event[] = []
  const add = (d: Date, narration: string, amount: number, direction: Event['direction'] = 'debit') =>
    ev.push({ date: iso(d), narration, amount, direction })
  const customers = ['IFEOMA NWOSU', 'KUNLE ADEYEMI', 'FATIMA BELLO', 'EMEKA OBI', 'SADE JOHNSON', 'GRACE EZE', 'MUSA IBRAHIM', 'JOY AKPAN'] as const

  for (const d of days(opts.today)) {
    const dom = d.getUTCDate()
    const dow = d.getUTCDay()
    const thisMonth = isThisMonth(d, opts.today)

    // Sales: Saturdays ~2x weekdays, Sundays quiet (the planted "best day" insight).
    const salesCount = dow === 6 ? r.int(9, 13) : dow === 0 ? r.int(1, 3) : r.int(4, 7)
    for (let i = 0; i < salesCount; i++) add(d, `TRANSFER FROM ${r.pick(customers)}`, round(r.int(2000, 14000), 100), 'credit')
    if (dow !== 0) add(d, 'POS SETTLEMENT - TERMINAL 2033', round(r.int(8000, 30000) * (dow === 6 ? 1.8 : 1), 50), 'credit')

    // Restock Mon/Wed/Fri (~₦1.2M a month, so profit is modest and believable);
    // supplier prices ~12% higher this month (the planted "costs squeezing profit" insight).
    if (dow === 1 || dow === 3 || dow === 5) {
      add(d, `TRANSFER TO ${r.pick(['ALHAJI MUSA RICE DEPOT', 'ONITSHA FOODSTUFF WHOLESALE'] as const)}`, round(r.int(80000, 110000) * (thisMonth ? 1.12 : 1), 500))
    }
    if (dom === 1) add(d, 'TRANSFER TO CHIEF ADEOLA - SHOP RENT', 60000)
    if (dom === 28) {
      add(d, 'TRANSFER TO AMAKA UDE - SALARY', 45000)
      add(d, 'TRANSFER TO BAYO SALAKO - SALARY', 40000)
    }
    if (dow === 2 || dow === 5) add(d, `TRANSFER TO ${r.pick(['SWIFT DISPATCH RIDERS', 'KWIK DELIVERY'] as const)}`, round(r.int(3000, 9000), 500))
    if (dow === 3) add(d, 'POS PURCHASE MRS FILLING STATION - GENERATOR FUEL', round(r.int(9000, 15000), 500))
    if (dom === 10) add(d, 'IKEDC POSTPAID BILL - SHOP', round(r.int(18000, 26000), 500))
    if (dow === 5) add(d, `TRANSFER TO ${opts.name.toUpperCase()} - OWNER PAY`, 20000)
    if (dom === 2) add(d, 'POS TERMINAL MAINTENANCE FEE', 1500)
    if (r.chance(0.03)) add(d, 'TRANSFER TO LAGOS STATE IRS - LEVY', 5000)
    // One unusually large credit last month (a family loan?) that should NOT count as a sale:
    // the app should ask about it instead of assuming.
    const lastMonth = new Date(Date.UTC(opts.today.getUTCFullYear(), opts.today.getUTCMonth() - 1, 15))
    if (iso(d) === iso(lastMonth)) add(d, 'TRANSFER FROM CHIDI EZE', 250000, 'credit')
  }
  return toRows(withCharges(ev), 450000)
}
