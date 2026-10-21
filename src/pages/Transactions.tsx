// All transactions for the current mode (most recent 500).
import AppShell from '../components/AppShell'
import TransactionList from '../components/TransactionList'
import { useMode } from '../mode'

export default function Transactions() {
  const { mode } = useMode()
  return (
    <AppShell title="Transactions">
      <div className="max-w-4xl">
        <TransactionList mode={mode} />
      </div>
    </AppShell>
  )
}
