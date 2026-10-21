// Drill-down: every transaction in one category for a month.
import { Link, useSearchParams } from 'react-router'
import TransactionList from '../components/TransactionList'
import { Screen } from '../components/ui'
import type { Mode } from '../lib/api'

export default function Category() {
  const [params] = useSearchParams()
  const mode = (params.get('mode') === 'business' ? 'business' : 'personal') as Mode
  const name = params.get('name') ?? ''
  const month = params.get('month') ?? undefined
  const monthName = month ? new Date(`${month}-01T12:00:00Z`).toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : ''
  return (
    <Screen>
      <Link to="/home" className="mb-4 text-sm text-slate-500">← Back</Link>
      <h1 className="text-2xl font-bold">{name}</h1>
      <p className="mb-4 text-sm text-slate-600">{monthName}</p>
      <TransactionList mode={mode} category={name} month={month} />
    </Screen>
  )
}
