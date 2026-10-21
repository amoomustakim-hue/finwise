// Pure helpers for reading money and dates out of bank statements. No I/O.

/** A transaction row as read from a statement, before it's saved. */
export type ParsedRow = {
  date: string // YYYY-MM-DD
  narration: string
  amountKobo: number // > 0
  direction: 'credit' | 'debit'
  balanceKobo?: number
}

/** "₦1,234.56", "1234.5", "(500.00)", "-500" -> kobo (integer, sign kept). null if not money. */
export function parseMoney(raw: string | undefined | null): number | null {
  if (raw == null) return null
  let s = String(raw).trim().replace(/[₦,\s]|NGN/gi, '')
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.startsWith('-')) {
    negative = !negative
    s = s.slice(1)
  }
  s = s.replace(/(CR|DR)$/i, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  const kobo = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  return negative ? -kobo : kobo
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}

/**
 * Parse common Nigerian statement dates. Numeric dates are DAY first (dd/mm/yyyy),
 * as Nigerian banks print them. Returns YYYY-MM-DD or null.
 */
export function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  let y: number, m: number, d: number

  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/) // 2026-09-02
  if (match) {
    ;[y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) {
    // 02/09/2026, 02-09-26
    ;[d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else if ((match = s.match(/^(\d{1,2})[\s/-]?([A-Za-z]{3,4})[A-Za-z]*[\s/,-]+(\d{2,4})/))) {
    // 02-Sep-2026, 02 Sep 26, 02SEP2026
    const month = MONTHS[match[2].toLowerCase()]
    if (!month) return null
    ;[d, m, y] = [Number(match[1]), month, Number(match[3])]
  } else {
    return null
  }

  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCDate() !== d) return null // e.g. 31/02
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Collapse whitespace so the same narration always looks the same. */
export const cleanNarration = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * Check running balances: each row's balance should equal the previous balance ± the row amount.
 * Returns how many consecutive pairs could be checked and how many matched.
 */
export function reconcile(rows: ParsedRow[]): { checked: number; matched: number } {
  let checked = 0
  let matched = 0
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].balanceKobo
    const cur = rows[i].balanceKobo
    if (prev == null || cur == null) continue
    checked++
    const delta = rows[i].direction === 'credit' ? rows[i].amountKobo : -rows[i].amountKobo
    if (Math.abs(prev + delta - cur) <= 1) matched++
  }
  return { checked, matched }
}
