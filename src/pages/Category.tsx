// Drill-down: every transaction in one category for a month.
import { useSearchParams } from 'react-router'
import AppShell from '../components/AppShell'
import TransactionList from '../components/TransactionList'
import { useMode } from '../mode'

export default function Category() {
  const [params] = useSearchParams()
  const { mode } = useMode()
  const name = params.get('name') ?? ''
  const month = params.get('month') ?? undefined
  const monthName = month ? new Date(`${month}-01T12:00:00Z`).toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : ''
  return (
    <AppShell title={name}>
      <div className="max-w-3xl">
        <p className="mb-4 text-sm text-slate-600">{monthName}</p>
        <TransactionList mode={mode} category={name} month={month} />
      </div>
    </AppShell>
  )
}
