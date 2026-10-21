// Home shell with the Personal/Business switch. Dashboards plug in here next.
import { useState } from 'react'
import { useAuth } from '../auth'
import TransactionList from '../components/TransactionList'
import { Screen } from '../components/ui'
import type { Mode } from '../lib/api'

const MODE_KEY = 'fw_mode'

function rememberedMode(): Mode | null {
  try {
    const v = localStorage.getItem(MODE_KEY)
    return v === 'personal' || v === 'business' ? v : null
  } catch {
    return null
  }
}

export default function Home() {
  const { user, signOut } = useAuth()
  const both = !!user?.uses_personal && !!user?.uses_business
  const fallback: Mode = user?.uses_personal ? 'personal' : 'business'
  const [mode, setMode] = useState<Mode>(() => (both ? (rememberedMode() ?? fallback) : fallback))

  function switchTo(m: Mode) {
    setMode(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      /* storage unavailable: switching still works for this visit */
    }
  }

  return (
    <Screen>
      <header className="mb-6 flex items-center justify-between">
        <span className="text-xl font-bold text-brand">FinWise</span>
        <button onClick={signOut} className="text-sm text-slate-500 underline">
          Sign out
        </button>
      </header>

      {both && (
        <div role="tablist" className="mb-6 grid grid-cols-2 rounded-xl bg-slate-200 p-1">
          {(['personal', 'business'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchTo(m)}
              className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                mode === m ? 'bg-white shadow' : 'text-slate-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <h1 className="mb-4 text-lg font-semibold">
        {mode === 'business' ? user?.business_name : `Hi ${user?.name.split(' ')[0]}`}
      </h1>
      <TransactionList mode={mode} />
    </Screen>
  )
}
