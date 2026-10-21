// PDF statements: extract text, then read rows with code.
// Direction (money in/out) comes from the running balance, which is far more reliable than
// guessing which column an amount sat in once the PDF's table layout has been flattened.
import { extractText, getDocumentProxy } from 'unpdf'
import { cleanNarration, parseDate, parseMoney, type ParsedRow } from './parse-utils.js'

const MONEY = /^\(?-?[₦]?\d{1,3}(,\d{3})*(\.\d{2})\)?(CR|DR)?$|^\(?-?\d+\.\d{2}\)?(CR|DR)?$/i
const STARTS_WITH_DATE =
  /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\s-]?[A-Za-z]{3,9}[\s,-]+\d{2,4})\b/

export async function pdfText(data: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(data)
  const { text } = await extractText(pdf, { mergePages: false })
  return text
}

type Candidate = { date: string; narration: string; amounts: number[]; raw: string }

/** Turn statement text into rows. Lines that look like transactions but don't parse go in `unparsed`. */
export function parseStatementText(pages: string[]): {
  rows: ParsedRow[]
  unparsed: string[]
  openingBalanceKobo?: number
} {
  const lines = pages.flatMap((p) => p.split(/\r?\n/)).map((l) => l.trim()).filter(Boolean)
  const candidates: Candidate[] = []
  let openingBalanceKobo: number | undefined

  for (const line of lines) {
    if (/opening balance|balance b\/f|brought forward/i.test(line)) {
      const nums = line.split(/\s+/).map(parseMoney).filter((n): n is number => n !== null)
      if (nums.length) openingBalanceKobo = nums[nums.length - 1]
      continue
    }
    const dateMatch = line.match(STARTS_WITH_DATE)
    if (!dateMatch) {
      // Continuation of the previous row's description (multi-line narrations).
      const last = candidates[candidates.length - 1]
      if (last && !/page \d+|statement|account (number|name)/i.test(line)) last.narration += ` ${line}`
      continue
    }
    const date = parseDate(dateMatch[1])
    if (!date) continue
    let rest = line.slice(dateMatch[0].length).trim()
    // Many statements print a value date right after the transaction date: drop it.
    const second = rest.match(STARTS_WITH_DATE)
    if (second && parseDate(second[1])) rest = rest.slice(second[0].length).trim()

    // Peel money tokens off the end of the line; what's left is the narration.
    const tokens = rest.split(/\s+/)
    const amounts: number[] = []
    while (tokens.length && MONEY.test(tokens[tokens.length - 1])) {
      amounts.unshift(parseMoney(tokens.pop()!)!)
    }
    candidates.push({ date, narration: tokens.join(' '), amounts, raw: line })
  }

  // Statements are sometimes newest-first; work oldest-first so balances flow forward.
  if (candidates.length > 1 && candidates[0].date > candidates[candidates.length - 1].date) candidates.reverse()

  const rows: ParsedRow[] = []
  const unparsed: string[] = []
  let prevBalance = openingBalanceKobo

  for (const c of candidates) {
    // Expect [..., amount(s), balance]. Zero placeholders (0.00 in the empty column) are ignored.
    const nonZero = c.amounts.slice(0, -1).filter((a) => a !== 0)
    const balance = c.amounts.length >= 2 ? c.amounts[c.amounts.length - 1] : undefined
    const amount = nonZero.length ? Math.abs(nonZero[nonZero.length - 1]) : undefined

    if (amount === undefined || balance === undefined) {
      unparsed.push(c.raw)
      continue
    }

    let direction: 'credit' | 'debit' | null = null
    if (prevBalance !== undefined) {
      if (Math.abs(prevBalance + amount - balance) <= 1) direction = 'credit'
      else if (Math.abs(prevBalance - amount - balance) <= 1) direction = 'debit'
    }
    // No usable previous balance (first row, or a gap): fall back to markers in the text.
    if (!direction) {
      if (/\bCR\b|transfer from|reversal|refund|deposit|inflow/i.test(c.raw)) direction = 'credit'
      else if (/\bDR\b|transfer to|pos|atm|withdrawal|charge|fee|vat|airtime|bill/i.test(c.raw)) direction = 'debit'
    }
    if (!direction) {
      unparsed.push(c.raw)
      prevBalance = balance
      continue
    }

    rows.push({
      date: c.date,
      narration: cleanNarration(c.narration) || 'No description',
      amountKobo: amount,
      direction,
      balanceKobo: balance,
    })
    prevBalance = balance
  }

  return { rows, unparsed, openingBalanceKobo }
}
