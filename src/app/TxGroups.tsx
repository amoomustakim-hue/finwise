// Transactions grouped by day under "Today", "Yesterday" or the date, as on the Activity design.
import { lagosMonth } from './data'
import { TxRow, type Tx } from './kit'

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })

function dayLabel(key: string) {
  const today = dayKey(new Date().toISOString())
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString())
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  const d = new Date(`${key}T12:00:00Z`)
  const sameYear = key.slice(0, 4) === today.slice(0, 4)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' })
}

/** Where tapping a row goes: unanswered ones to Review, the rest to their category for that month. */
export const rowLink = (t: Tx) =>
  t.category_status === 'pending' || !t.category ? '/review' : `/category?name=${encodeURIComponent(t.category)}&month=${lagosMonth(t.occurred_at)}`

export default function TxGroups({ txs, link = true, byMerchant = false }: { txs: Tx[]; link?: boolean; byMerchant?: boolean }) {
  const groups: { key: string; rows: Tx[] }[] = []
  for (const t of txs) {
    const key = dayKey(t.occurred_at)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.rows.push(t)
    else groups.push({ key, rows: [t] })
  }
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <section key={g.key}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9a9195]">{dayLabel(g.key)}</p>
          <div className="divide-y divide-black/[0.05]">
            {g.rows.map((t) => (
              <TxRow key={t.id} t={t} to={link ? rowLink(t) : undefined} byMerchant={byMerchant} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
