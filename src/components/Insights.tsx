// Up to 3 insights, each with its evidence ("Why?") and one action. Numbers come from the engine;
// when the AI reworded the text, we say so.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api, type Mode } from '../lib/api'

type Insight = { id: string; title: string; body: string; evidence: string[]; action: { label: string; to: string }; source: 'template' | 'ai' }

export default function Insights({ mode, version }: { mode: Mode; version: number }) {
  const [items, setItems] = useState<Insight[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    api<{ insights: Insight[] }>(`/insights?mode=${mode}`).then((r) => setItems(r.insights)).catch(() => setItems([]))
  }, [mode, version])

  if (!items?.length) return null
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Insights for you</h2>
        {items.some((i) => i.source === 'ai') && <span className="text-xs text-slate-500">Worded with AI · numbers calculated from your data</span>}
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {items.map((i) => (
          <article key={i.id} className="flex flex-col rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="font-semibold">{i.title}</p>
            <p className="mt-1 flex-1 text-sm text-slate-600">{i.body}</p>
            {open === i.id && (
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                {i.evidence.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <button onClick={() => setOpen(open === i.id ? null : i.id)} className="text-xs font-semibold text-slate-500 underline">
                {open === i.id ? 'Hide evidence' : 'Why?'}
              </button>
              <Link to={i.action.to} className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
                {i.action.label}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
