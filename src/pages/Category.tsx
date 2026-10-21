// Drill-down: every transaction in one category for a month.
import { Link, useSearchParams } from 'react-router'
import AppShell from '../components/AppShell'
import TxGroups from '../app/TxGroups'
import { isSpend, useTransactions } from '../app/data'
import { CategoryIcon, monthLabel, naira } from '../app/kit'
import { useMode } from '../mode'

export default function Category() {
  const [params] = useSearchParams()
  const { mode } = useMode()
  const name = params.get('name') ?? ''
  const month = params.get('month') ?? undefined
  const txs = useTransactions(mode, { category: name, month })
  const list = txs.data?.transactions ?? null
  const spent = list?.filter(isSpend).reduce((n, t) => n + t.amount_kobo, 0) ?? 0
  const received = list?.filter((t) => t.direction === 'credit').reduce((n, t) => n + t.amount_kobo, 0) ?? 0

  return (
    <AppShell title={name} back="/analytics">
      <div className="mx-auto max-w-[640px] lg:mx-0">
        <div className="flex items-center gap-4">
          <CategoryIcon category={name} size="h-14 w-14" />
          <div>
            <p className="text-[13px] text-[#7a7175]">{month ? monthLabel(month, true) : 'All time'}</p>
            <p className="text-[26px] font-semibold tracking-[-0.01em]">{list ? naira(spent || received) : '…'}</p>
            {list && <p className="text-[12px] text-[#8a8185]">{list.length} transaction{list.length === 1 ? '' : 's'}</p>}
          </div>
        </div>
        <div className="mt-6">
          {txs.error && <p className="text-[14px] text-[#d64545]">{txs.error}</p>}
          {!list && !txs.error && <p className="text-[14px] text-[#8a8185]">Loading…</p>}
          {list && !list.length && <p className="text-[14px] text-[#8a8185]">No transactions in this category{month ? ` in ${monthLabel(month)}` : ''}.</p>}
          {list && list.length > 0 && <TxGroups txs={list} link={false} byMerchant />}
        </div>
        {spent > 0 && (
          <Link to={`/budgets/new?category=${encodeURIComponent(name)}`} className="mt-6 inline-flex items-center gap-2 rounded-[12px] bg-blush px-4 py-2.5 text-[13px] font-semibold text-brand">
            Set a budget for {name}
          </Link>
        )}
      </div>
    </AppShell>
  )
}
