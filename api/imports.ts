// POST /api/imports — upload a bank statement (PDF or CSV) as multipart form data.
// Fields: file, mode ('personal' | 'business'), bankName.
import { requireUser } from '../server/auth.js'
import { parseCsv } from '../server/import/csv.js'
import { reconcile, type ParsedRow } from '../server/import/parse-utils.js'
import { parseStatementText, pdfText } from '../server/import/pdf.js'
import { findOrCreateAccount, saveRows } from '../server/import/save.js'
import { handle, HttpError } from '../server/http.js'

const MAX_BYTES = 4 * 1024 * 1024 // Vercel caps request bodies at 4.5 MB

export const POST = handle(async (request) => {
  const user = await requireUser(request)
  const form = await request.formData().catch(() => {
    throw new HttpError(400, 'Upload the statement as a file')
  })

  const file = form.get('file')
  const mode = String(form.get('mode') ?? '')
  const bankName = String(form.get('bankName') ?? '').trim()
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, 'Choose a statement file')
  if (file.size > MAX_BYTES) throw new HttpError(413, 'File is too large (max 4 MB)')
  if (mode !== 'personal' && mode !== 'business') throw new HttpError(400, 'Choose Personal or Business')
  if ((mode === 'personal' && !user.uses_personal) || (mode === 'business' && !user.uses_business)) {
    throw new HttpError(400, `You haven't turned on ${mode} mode`)
  }
  if (bankName.length < 2) throw new HttpError(400, 'Choose the bank this statement is from')

  const name = file.name.toLowerCase()
  const bytes = new Uint8Array(await file.arrayBuffer())
  let rows: ParsedRow[]
  let notRead = 0

  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const r = await parseCsv(new TextDecoder().decode(bytes)).catch((e: Error) => {
      throw new HttpError(422, e.message)
    })
    rows = r.rows
  } else if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pages = await pdfText(bytes).catch(() => {
      throw new HttpError(422, "We couldn't read this PDF. If it's password-protected, remove the password and try again.")
    })
    if (!pages.join('').trim()) {
      throw new HttpError(422, 'This PDF has no readable text (it may be a scanned image). Try the CSV version.')
    }
    const r = parseStatementText(pages)
    rows = r.rows
    notRead = r.unparsed.length
  } else {
    throw new HttpError(415, 'Upload a PDF or CSV statement')
  }

  if (!rows.length) throw new HttpError(422, "We couldn't find any transactions in this statement.")

  const accountId = await findOrCreateAccount({ userId: user.id, mode, bankName, source: 'import' })
  const imported = await saveRows({ userId: user.id, accountId, mode, source: 'import', rows })
  const dates = rows.map((r) => r.date).sort()
  const balances = reconcile(rows)

  return Response.json({
    found: rows.length,
    imported,
    duplicates: rows.length - imported,
    notRead,
    from: dates[0],
    to: dates[dates.length - 1],
    balanceCheck: balances, // { checked, matched } running-balance pairs
  })
})
