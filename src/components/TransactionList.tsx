// Transaction list for one mode, with a "Sample data" badge when any row is synthetic.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api, type Mode } from '../lib/api'
import { formatDate, formatNaira } from '../lib/format'

type Tx = {
  id: string
  occurred_at: string
  amount_kobo: number
  direction: 'credit' | 'debit'
  narration: string
  category: string | null
  category_status: 'pending' | 'suggested' | 'confirmed'
  source: 'mono' | 'import' | 'demo' | 'manual'
  bank_name: string
}

export default function TransactionList({ mode }: { mode: Mode }) {
  const [txs, setTxs] = useState<Tx[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setTxs(null)
    api<{ transactions: Tx[] }>(`/transactions?mode=${mode}`)
      .then((r) => setTxs(r.transactions))
      .catch((e) => setError(e.message))
  }, [mode])

  if (error) return <p className="text-red-700">{error}</p>
  if (!txs) return <p className="text-slate-500">Loading transactions…</p>
  if (!txs.length) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <p className="font-semibold">No transactions yet</p>
        <p className="mt-1 text-sm text-slate-600">Import a bank statement or load sample data to get started.</p>
        <Link to={`/import?mode=${mode}`} className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 font-semibold text-white">
          Add transactions
        </Link>
      </div>
    )
  }

  const hasDemo = txs.some((t) => t.source === 'demo')
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Transactions</h2>
        <div className="flex items-center gap-2">
          {hasDemo && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Sample data</span>}
          <Link to={`/import?mode=${mode}`} className="text-sm font-semibold text-brand">+ Add</Link>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-200">
        {txs.slice(0, 100).map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t.narration}</p>
              <p className="text-xs text-slate-500">
                {formatDate(t.occurred_at)} · {t.category ?? 'Awaiting category'}
              </p>
            </div>
            <span className={`shrink-0 text-sm font-semibold ${t.direction === 'credit' ? 'text-emerald-700' : 'text-slate-900'}`}>
              {t.direction === 'credit' ? '+' : '−'}
              {formatNaira(t.amount_kobo)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
