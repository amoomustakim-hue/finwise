// CSV statements: find the header row, map columns by name (AI only if names are unclear).
import Papa from 'papaparse'
import { z } from 'zod'
import { llmJson, LlmUnavailable } from '../llm.js'
import { cleanNarration, parseDate, parseMoney, type ParsedRow } from './parse-utils.js'

type Columns = { date: number; narration: number; debit?: number; credit?: number; amount?: number; balance?: number }

// Header names banks commonly use, lower-cased.
const NAMES = {
  date: ['date', 'trans date', 'transaction date', 'trans. date', 'posting date', 'posted date', 'value date', 'txn date'],
  narration: ['description', 'narration', 'details', 'transaction details', 'remarks', 'particulars', 'narrative', 'memo'],
  debit: ['debit', 'debits', 'withdrawal', 'withdrawals', 'money out', 'dr', 'debit amount', 'paid out'],
  credit: ['credit', 'credits', 'deposit', 'deposits', 'lodgement', 'lodgements', 'money in', 'cr', 'credit amount', 'paid in'],
  amount: ['amount', 'transaction amount', 'amount (ngn)', 'amount(ngn)'],
  balance: ['balance', 'running balance', 'closing balance', 'available balance', 'balance (ngn)'],
}

function matchColumns(header: string[]): Columns | null {
  const norm = header.map((h) => h.trim().toLowerCase())
  const find = (names: string[]) => {
    const i = norm.findIndex((h) => names.includes(h))
    return i >= 0 ? i : undefined
  }
  // Prefer "transaction date" over "value date" when both exist.
  const date = find(NAMES.date)
  const narration = find(NAMES.narration)
  if (date === undefined || narration === undefined) return null
  const cols: Columns = {
    date,
    narration,
    debit: find(NAMES.debit),
    credit: find(NAMES.credit),
    amount: find(NAMES.amount),
    balance: find(NAMES.balance),
  }
  if (cols.amount === undefined && (cols.debit === undefined || cols.credit === undefined)) return null
  return cols
}

// When header names are unusual, ask the AI which column is which (header + 2 rows only).
const ColumnSchema = z.object({
  date: z.number().int(),
  narration: z.number().int(),
  debit: z.number().int().nullable().optional(),
  credit: z.number().int().nullable().optional(),
  amount: z.number().int().nullable().optional(),
  balance: z.number().int().nullable().optional(),
})

async function aiColumns(header: string[], samples: string[][]): Promise<Columns | null> {
  try {
    const r = await llmJson({
      system:
        'You map bank statement CSV columns. Reply with JSON giving 0-based column indexes: ' +
        '{"date":n,"narration":n,"debit":n|null,"credit":n|null,"amount":n|null,"balance":n|null}. ' +
        'Use "amount" only when one signed column holds both money in and out.',
      user: JSON.stringify({ header, samples }),
      schema: ColumnSchema,
      maxTokens: 300,
    })
    const ok = (i: number | null | undefined) => (i != null && i >= 0 && i < header.length ? i : undefined)
    const cols: Columns = {
      date: r.date,
      narration: r.narration,
      debit: ok(r.debit),
      credit: ok(r.credit),
      amount: ok(r.amount),
      balance: ok(r.balance),
    }
    return ok(cols.date) !== undefined && ok(cols.narration) !== undefined ? cols : null
  } catch (err) {
    if (err instanceof LlmUnavailable) return null
    throw err
  }
}

export async function parseCsv(text: string): Promise<{ rows: ParsedRow[]; skipped: number }> {
  const grid = Papa.parse<string[]>(text.replace(/^﻿/, ''), { skipEmptyLines: true }).data

  // Banks often put account details above the table: look for the header in the first 40 rows.
  let headerIndex = -1
  let cols: Columns | null = null
  for (let i = 0; i < Math.min(grid.length, 40); i++) {
    cols = matchColumns(grid[i])
    if (cols) {
      headerIndex = i
      break
    }
  }
  if (!cols) {
    // Fall back to AI on the widest row that looks like a header (mostly non-numeric).
    headerIndex = grid.findIndex((r) => r.length >= 3 && r.filter((c) => parseMoney(c) === null).length >= r.length - 1)
    if (headerIndex >= 0) cols = await aiColumns(grid[headerIndex], grid.slice(headerIndex + 1, headerIndex + 3))
  }
  if (!cols) throw new Error("We couldn't find the date, description and amount columns in this CSV.")

  const rows: ParsedRow[] = []
  let skipped = 0
  for (const r of grid.slice(headerIndex + 1)) {
    const date = parseDate(r[cols.date])
    const narration = cleanNarration(r[cols.narration] ?? '')
    let signed: number | null = null
    if (cols.amount !== undefined) {
      signed = parseMoney(r[cols.amount])
    } else {
      const debit = parseMoney(r[cols.debit!]) ?? 0
      const credit = parseMoney(r[cols.credit!]) ?? 0
      signed = credit !== 0 ? Math.abs(credit) : debit !== 0 ? -Math.abs(debit) : null
    }
    if (!date || signed === null || signed === 0) {
      skipped++ // totals, opening balance lines, blank rows
      continue
    }
    const balance = cols.balance !== undefined ? parseMoney(r[cols.balance]) : null
    rows.push({
      date,
      narration: narration || 'No description',
      amountKobo: Math.abs(signed),
      direction: signed > 0 ? 'credit' : 'debit',
      balanceKobo: balance ?? undefined,
    })
  }
  // Statements are sometimes newest-first; return oldest-first so running balances flow forward.
  if (rows.length > 1 && rows[0].date > rows[rows.length - 1].date) rows.reverse()
  return { rows, skipped }
}
