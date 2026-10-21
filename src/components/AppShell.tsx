// Signed-in layout, from Rejoice's designs.
// Phone: the screen fills the width; a tab bar sits at the bottom (Overview, Analytics, a raised
// button for quick actions, AI Insights, Activities). Desktop (lg+): a side panel with every page.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../auth'
import { useMode } from '../mode'
import { Icon, PageHeader, Sparkle, type IconName } from '../app/kit'

type Item = { to: string; label: string; icon: IconName; match?: string[] }

const TABS: Item[] = [
  { to: '/home', label: 'Overview', icon: 'grid' },
  { to: '/analytics', label: 'Analytics', icon: 'bars', match: ['/category'] },
  { to: '/insights', label: 'AI Insights', icon: 'brain' },
  { to: '/transactions', label: 'Activities', icon: 'receipt' },
]

// Behind the raised button on phones and the "Quick actions" button in the side panel.
const ACTIONS: (Item & { sub: string })[] = [
  { to: '/simulator', label: 'Ask the Decision Simulator', sub: 'Can I afford it? See before you pay', icon: 'swap' },
  { to: '/import', label: 'Add transactions', sub: 'Link a bank or upload a statement', icon: 'upload' },
  { to: '/budgets/new', label: 'Create a budget', sub: 'Set a limit for a category', icon: 'target' },
  { to: '/review', label: 'Review transactions', sub: 'Answer what each payment was for', icon: 'checkCircle' },
]

const SIDE_TOOLS: Item[] = [
  { to: '/review', label: 'Review', icon: 'checkCircle' },
  { to: '/budgets', label: 'Budgets', icon: 'target', match: ['/budgets/'] },
  { to: '/simulator', label: 'Simulator', icon: 'swap' },
  { to: '/import', label: 'Add data', icon: 'upload', match: ['/mono/return'] },
]

const isOn = (path: string, n: Item) => path === n.to || (n.match ?? []).some((m) => path.startsWith(m))

export function ModeSwitch() {
  const { mode, setMode, both } = useMode()
  if (!both) return null
  return (
    <div role="tablist" aria-label="Mode" className="grid grid-cols-2 rounded-[12px] bg-[#f4f2f3] p-1 text-[13px]">
      {(['personal', 'business'] as const).map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          onClick={() => setMode(m)}
          className={`rounded-[9px] px-3 py-1.5 font-medium capitalize transition ${mode === m ? 'bg-white text-brand shadow-[0_2px_6px_rgb(0_0_0/0.08)]' : 'text-[#6a6165]'}`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 bg-[#1a1215]/40 lg:grid lg:place-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3 shadow-2xl lg:relative lg:w-[420px] lg:rounded-[22px] lg:pb-6 lg:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-black/10 lg:hidden" />
        {children}
      </div>
    </div>
  )
}

/** Who's signed in, the Personal/Business switch and sign out. Opened from the avatar on Overview. */
export function AccountSheet({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth()
  const { mode } = useMode()
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-blush text-brand">
          <Icon name="user" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user?.name}</p>
          <p className="truncate text-[13px] text-[#7a7175]">{mode === 'business' && user?.business_name ? user.business_name : user?.email}</p>
        </div>
      </div>
      <div className="mt-5">
        <ModeSwitch />
      </div>
      <button onClick={signOut} className="mt-4 flex w-full items-center gap-3 py-2 text-[15px] font-medium text-[#d64545]">
        <Icon name="logout" /> Sign out
      </button>
    </Sheet>
  )
}

function QuickActions({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <p className="flex items-center gap-2 text-[17px] font-semibold">
        <Sparkle className="h-5 w-5 text-brand" /> What would you like to do?
      </p>
      <ul className="mt-3 flex flex-col">
        {ACTIONS.map((a) => (
          <li key={a.to}>
            <Link to={a.to} onClick={onClose} className="flex items-center gap-3.5 rounded-[14px] py-3 transition hover:bg-black/[0.02]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-blush text-brand">
                <Icon name={a.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{a.label}</span>
                <span className="block truncate text-[12px] text-[#8a8185]">{a.sub}</span>
              </span>
              <Icon name="chevron" className="h-4 w-4 text-[#b0a6aa]" />
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function TabBar({ path, onAction }: { path: string; onAction: () => void }) {
  const tab = (n: Item) => {
    const on = isOn(path, n)
    return (
      <NavLink key={n.to} to={n.to} className={`flex flex-1 flex-col items-center gap-1 pt-2 text-[11px] ${on ? 'font-semibold text-brand' : 'text-[#9a9195]'}`}>
        <Icon name={n.icon} className="h-[22px] w-[22px]" />
        {n.label}
      </NavLink>
    )
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-start border-t border-black/[0.06] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur lg:hidden">
      {TABS.slice(0, 2).map(tab)}
      <span className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={onAction}
          aria-label="Quick actions"
          className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-brand-grad text-white shadow-[0_10px_22px_-8px_rgb(152_0_66/0.7)] ring-4 ring-white transition active:scale-95"
        >
          <Sparkle className="h-6 w-6" />
        </button>
      </span>
      {TABS.slice(2).map(tab)}
    </nav>
  )
}

function SideLink({ n, path }: { n: Item; path: string }) {
  const on = isOn(path, n)
  return (
    <Link to={n.to} className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] transition ${on ? 'bg-blush font-semibold text-brand' : 'text-[#4a4246] hover:bg-black/[0.03]'}`}>
      <Icon name={n.icon} className="h-5 w-5" />
      {n.label}
    </Link>
  )
}

function SidePanel({ path, onAction }: { path: string; onAction: () => void }) {
  const { user, signOut } = useAuth()
  const { mode } = useMode()
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-black/[0.06] bg-white px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh">
      <Link to="/home" className="flex items-center gap-2.5 px-2">
        <img src="/icon.svg" alt="" className="h-8 w-8" />
        <span className="text-[19px] font-semibold tracking-tight">FinWise</span>
      </Link>
      <div className="mt-6">
        <ModeSwitch />
      </div>
      <nav className="mt-5 flex flex-col gap-0.5">
        {TABS.map((n) => <SideLink key={n.to} n={n} path={path} />)}
      </nav>
      <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#a39a9e]">Tools</p>
      <nav className="mt-2 flex flex-col gap-0.5">
        {SIDE_TOOLS.map((n) => <SideLink key={n.to} n={n} path={path} />)}
      </nav>
      <button onClick={onAction} className="mt-5 flex items-center justify-center gap-2 rounded-[14px] bg-brand-grad px-4 py-3 text-[14px] font-semibold text-white shadow-[0_12px_24px_-12px_rgb(152_0_66/0.7)]">
        <Sparkle className="h-[18px] w-[18px]" /> Quick actions
      </button>
      <div className="mt-auto flex items-center gap-3 rounded-[14px] bg-[#fafafa] p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blush text-brand">
          <Icon name="user" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{user?.name}</p>
          <p className="truncate text-[12px] text-[#8a8185]">{mode === 'business' && user?.business_name ? user.business_name : user?.email}</p>
        </div>
        <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 place-items-center rounded-full text-[#8a8185] hover:bg-black/5 hover:text-[#d64545]">
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </aside>
  )
}

/**
 * `title` draws the inner-screen header (back arrow and centred title on phones). Pages with their
 * own header, like Overview, pass `bare` and lay out the top themselves.
 */
export default function AppShell({
  title,
  actions,
  right,
  back,
  bare = false,
  children,
}: {
  title?: string
  actions?: ReactNode
  right?: ReactNode // a small control beside the title on every screen size, like a bell
  back?: string | false
  bare?: boolean
  children: ReactNode
}) {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [sheet, setSheet] = useState(false)

  return (
    <div className="min-h-dvh lg:flex">
      <SidePanel path={pathname} onAction={() => setSheet(true)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {user?.is_demo && (
          <div className="bg-[#fff4e0] px-4 py-2 text-center text-[12px] text-[#7a4b00] lg:text-[13px]">
            You're exploring a <span className="font-semibold">demo account</span> with sample data. It's deleted automatically after 24 hours.{' '}
            <button onClick={async () => { await signOut(); window.location.href = '/signup' }} className="font-semibold underline">
              Create your own account
            </button>
          </div>
        )}

        <main className={`mx-auto w-full max-w-6xl flex-1 pb-28 lg:px-8 lg:pb-12 ${bare ? 'lg:pt-8' : 'px-5 pt-4 lg:pt-8'}`}>
          {title && (
            <>
              <PageHeader title={title} back={back} right={right ?? (actions && <span className="hidden lg:block">{actions}</span>)} />
              {actions && !right && <div className="-mt-2 mb-5 lg:hidden">{actions}</div>}
            </>
          )}
          {!title && actions && <div className="mb-5 flex justify-end">{actions}</div>}
          {children}
        </main>

        <TabBar path={pathname} onAction={() => setSheet(true)} />
        {sheet && <QuickActions onClose={() => setSheet(false)} />}
      </div>
    </div>
  )
}
