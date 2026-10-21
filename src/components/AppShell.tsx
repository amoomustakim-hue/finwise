// Signed-in layout. Desktop (lg+): left sidebar with navigation and the mode switch, wide content.
// Phone: top bar with the mode switch, bottom navigation bar.
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../auth'
import { useMode } from '../mode'

// `phone: true` items sit in the phone's bottom bar; the rest live under "More".
const NAV = [
  { to: '/home', label: 'Home', icon: '⌂', phone: true },
  { to: '/transactions', label: 'Activity', icon: '≡', phone: true },
  { to: '/review', label: 'Review', icon: '✓', phone: false },
  { to: '/budgets', label: 'Budgets', icon: '◔', phone: false },
  { to: '/simulator', label: 'Simulator', icon: '⇄', phone: true },
  { to: '/my-qr', label: 'My QR', icon: '▣', phone: false },
  { to: '/pay', label: 'Pay', icon: '⌁', phone: true },
  { to: '/import', label: 'Add data', icon: '+', phone: false },
]

function ModeSwitch({ compact = false }: { compact?: boolean }) {
  const { mode, setMode, both } = useMode()
  if (!both) return null
  return (
    <div role="tablist" aria-label="Mode" className={`grid grid-cols-2 rounded-xl bg-slate-200 p-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {(['personal', 'business'] as const).map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          onClick={() => setMode(m)}
          className={`rounded-lg px-3 py-1.5 font-semibold capitalize ${mode === m ? 'bg-white shadow' : 'text-slate-600'}`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand/10 text-brand' : 'text-slate-700 hover:bg-slate-100'}`

export default function AppShell({ title, actions, children }: { title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const { user, signOut } = useAuth()
  const { mode } = useMode()
  const [more, setMore] = useState(false)

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white px-4 py-6 lg:flex lg:sticky lg:top-0 lg:h-dvh">
        <span className="px-3 text-2xl font-bold text-brand">FinWise</span>
        <ModeSwitch />
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkClass}>
              <span aria-hidden className="w-5 text-center">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-3 text-sm">
          <p className="font-medium">{user?.name}</p>
          {mode === 'business' && <p className="text-slate-500">{user?.business_name}</p>}
          <button onClick={signOut} className="mt-2 text-slate-500 underline">Sign out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur lg:hidden">
          <span className="text-xl font-bold text-brand">FinWise</span>
          <ModeSwitch compact />
          <button onClick={signOut} className="text-xs text-slate-500 underline">Sign out</button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          {(title || actions) && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              {title && <h1 className="text-xl font-bold lg:text-2xl">{title}</h1>}
              {actions}
            </div>
          )}
          {children}
        </main>

        {/* Phone: "More" sheet with the remaining pages */}
        {more && (
          <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setMore(false)}>
            <nav className="absolute inset-x-0 bottom-16 mx-3 grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
              {NAV.filter((n) => !n.phone).map((n) => (
                <NavLink key={n.to} to={n.to} onClick={() => setMore(false)} className={linkClass}>
                  <span aria-hidden className="w-5 text-center">{n.icon}</span>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Phone bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
          {NAV.filter((n) => n.phone).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `flex flex-col items-center py-2 text-xs ${isActive ? 'font-semibold text-brand' : 'text-slate-600'}`}
            >
              <span aria-hidden className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          <button onClick={() => setMore((m) => !m)} aria-expanded={more} className={`flex flex-col items-center py-2 text-xs ${more ? 'font-semibold text-brand' : 'text-slate-600'}`}>
            <span aria-hidden className="text-lg leading-none">⋯</span>
            More
          </button>
        </nav>
      </div>
    </div>
  )
}
