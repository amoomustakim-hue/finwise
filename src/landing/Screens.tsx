// The five app screens from Rejoice's designs, rebuilt for the phone mockups:
// Overview, Analytics, AI Insight, Create Budget and Activity. Sample data only.
// Every size scales with the phone width (--pw), so they stay sharp at any size.
import type { CSSProperties, ReactNode } from 'react'

const BRAND = 'linear-gradient(115deg, #4f0022 0%, #710131 32%, #980042 72%, #980142 100%)'
const f = (k: number): CSSProperties => ({ fontSize: `calc(var(--pw) * ${k})` })
const box = (k: number): CSSProperties => ({ width: `calc(var(--pw) * ${k})`, height: `calc(var(--pw) * ${k})` })

/* ───────────── Icons ───────────── */

const P = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  chevron: 'm9 6 6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  up: 'M12 19V5M6 11l6-6 6 6',
  cart: 'M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2M9 20h.01M17 20h.01',
  car: 'M5 16V11l1.8-4.2A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.8 1.3L19 11v5M5 16h14M5 16v2M19 16v2M7.5 13h.01M16.5 13h.01M5 11h14',
  signal: 'M12 13v8M8.5 9.5a5 5 0 0 1 7 0M6 7a8.5 8.5 0 0 1 12 0M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  bank: 'M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6z',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  filter: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  check: 'M5 12.5 10 17l9-10',
  send: 'M12 19V6M6 11l6-6 6 6',
  trend: 'M4 16l5-5 4 4 7-7M15 8h5v5',
  calendarCheck: 'M7 3v3M17 3v3M4 9h16M5 5h14v15H5zM9 14l2 2 4-4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  bars: 'M6 20V10M12 20V4M18 20v-7',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  brain: 'M12 5a3 3 0 0 0-5.6 1.5A3 3 0 0 0 5 12a3 3 0 0 0 2 5 3 3 0 0 0 5 1V5zM12 5a3 3 0 0 1 5.6 1.5A3 3 0 0 1 19 12a3 3 0 0 1-2 5 3 3 0 0 1-5 1',
}
function I({ n, k = 0.05, sw = 1.8, className = '' }: { n: keyof typeof P; k?: number; sw?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" style={box(k)} className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  )
}
function Sparkle({ k = 0.06, className = '' }: { k?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" style={box(k)} className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" />
      <path d="M18 13.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5zM18.5 2.5c.2 1 .6 1.4 1.5 1.5-.9.2-1.3.6-1.5 1.5-.2-.9-.6-1.3-1.5-1.5.9-.1 1.3-.5 1.5-1.5z" />
    </svg>
  )
}

/* ───────────── Shared pieces ───────────── */

const TINT = {
  food: { bg: '#fdecd6', fg: '#e08a1e', icon: 'cart' as const },
  transport: { bg: '#e2f3ea', fg: '#1f8a5b', icon: 'car' as const },
  telecom: { bg: '#e3f3fb', fg: '#2b9bc9', icon: 'signal' as const },
  income: { bg: '#e2f3ea', fg: '#1f8a5b', icon: 'bank' as const },
  bills: { bg: '#fde4e4', fg: '#d64545', icon: 'bolt' as const },
  airtime: { bg: '#eceef1', fg: '#3d4450', icon: 'phone' as const },
}

function Tx({ kind, title, sub, amount, right, positive }: { kind: keyof typeof TINT; title: string; sub: string; amount: string; right?: string; positive?: boolean }) {
  const t = TINT[kind]
  return (
    <div className="flex items-center gap-[3.5%] py-[2.6%]">
      <span className="grid shrink-0 place-items-center rounded-[22%]" style={{ ...box(0.105), background: t.bg, color: t.fg }}>
        <I n={t.icon} k={0.05} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[#1a1215]" style={f(0.04)}>{title}</span>
        <span className="block truncate text-[#8a8185]" style={f(0.026)}>{sub}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-semibold" style={{ ...f(0.034), color: positive ? '#1f8a5b' : '#e0533a' }}>{amount}</span>
        {right && <span className="block text-[#8a8185]" style={f(0.026)}>{right}</span>}
      </span>
    </div>
  )
}

function TopBar({ title, bell = false }: { title: string; bell?: boolean }) {
  return (
    <div className="flex items-center justify-between px-[6%] pt-[16%] text-[#1a1215]">
      <I n="back" k={0.055} />
      <span className="font-semibold" style={f(0.042)}>{title}</span>
      <span style={box(0.055)}>{bell && <I n="bell" k={0.055} />}</span>
    </div>
  )
}

/** The app's tab bar with the raised AI button in the middle. */
function TabBar({ active }: { active: 'overview' | 'analytics' | 'insights' | 'activities' }) {
  const items: [typeof active, string, keyof typeof P][] = [
    ['overview', 'Overview', 'grid'],
    ['analytics', 'Analytics', 'bars'],
    ['insights', 'AI Insights', 'brain'],
    ['activities', 'Activities', 'receipt'],
  ]
  const tab = ([id, label, icon]: (typeof items)[number]) => (
    <span key={id} className={`flex flex-1 flex-col items-center gap-[2px] ${id === active ? 'font-semibold text-[#980042]' : 'text-[#9a9195]'}`} style={f(0.026)}>
      <I n={icon} k={0.052} />
      {label}
    </span>
  )
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-end border-t border-black/[0.06] bg-white px-[3%] pb-[7%] pt-[3%]">
      {items.slice(0, 2).map(tab)}
      <span className="flex flex-1 justify-center">
        <span className="-mt-[60%] grid place-items-center rounded-full text-white ring-4 ring-white shadow-[0_8px_18px_-6px_rgb(152_0_66/0.6)]" style={{ ...box(0.13), background: BRAND }}>
          <Sparkle k={0.06} />
        </span>
      </span>
      {items.slice(2).map(tab)}
    </div>
  )
}

function Screen({ children, bg = '#fff' }: { children: ReactNode; bg?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden text-left" style={{ background: bg }}>
      {children}
    </div>
  )
}

/* ───────────── 1. Overview ───────────── */

export function OverviewScreen() {
  return (
    <Screen bg="#fafafa">
      <div className="px-[6%] pb-[14%] pt-[16%] text-white" style={{ background: BRAND }}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-[3%]">
            <span className="icon-glass" style={box(0.1)}><I n="user" k={0.05} /></span>
            <span className="whitespace-nowrap font-medium" style={f(0.045)}>Hi, Ada</span>
          </span>
          <span className="icon-glass" style={box(0.1)}><I n="bell" k={0.05} /></span>
        </div>
        <p className="mt-[8%] text-center text-white/85" style={f(0.036)}>Total Balance</p>
        <p className="num flex items-center justify-center gap-[3%] leading-none" style={f(0.098)}>
          ₦845,500.00 <I n="eye" k={0.05} />
        </p>
      </div>
      <div className="relative -mt-[9%] px-[5%]">
        <div className="rounded-[calc(var(--pw)*0.045)] bg-white p-[4.5%] shadow-[0_8px_20px_-12px_rgb(79_0_34/0.35)]">
          <div className="flex items-center gap-[3%]">
            <Sparkle k={0.065} className="text-[#980042]" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium leading-tight text-[#1a1215]" style={f(0.043)}>Your AI insight</span>
              <span className="block text-[#7a7175]" style={f(0.027)}>Personalised financial update</span>
            </span>
            <I n="chevron" k={0.045} className="text-[#4a4246]" />
          </div>
          <p className="mt-[3%] leading-snug text-[#1a1215]" style={f(0.032)}>Your spending is 12% higher than last month, mainly due to food and transportation.</p>
        </div>

        <div className="mt-[6%] flex items-baseline justify-between">
          <span className="font-semibold text-[#1a1215]" style={f(0.042)}>Overview</span>
          <span className="font-medium text-[#980042]" style={f(0.03)}>View All</span>
        </div>
        <div className="mt-[3.5%] grid grid-cols-2 gap-[3%]">
          {[
            { label: 'Income', value: '₦3,850,000', chip: '+12.4%', arrow: 'down' as const, bg: 'linear-gradient(150deg,#b3004f,#7a0035)' },
            { label: 'Expenses', value: '₦1,920,400', chip: 'Safe Limit', arrow: 'up' as const, bg: 'linear-gradient(150deg,#3a3f4b,#232730)' },
          ].map((c) => (
            <div key={c.label} className="relative overflow-hidden rounded-[calc(var(--pw)*0.045)] p-[7%] text-white" style={{ background: c.bg }}>
              <span aria-hidden="true" className="absolute -bottom-[25%] -right-[20%] rounded-full border-[calc(var(--pw)*0.012)] border-white/10" style={box(0.3)} />
              <div className="flex items-center justify-between">
                <span className="grid place-items-center rounded-full bg-white text-[#1a1215]" style={box(0.075)}>
                  <I n={c.arrow} k={0.04} sw={2.2} />
                </span>
                <span className="rounded-full bg-white/20 px-[7%] py-[2%]" style={f(0.024)}>{c.chip}</span>
              </div>
              <p className="mt-[16%] text-white/85" style={f(0.03)}>{c.label}</p>
              <p className="num font-semibold" style={f(0.046)}>{c.value}</p>
              <p className="text-white/70" style={f(0.024)}>This Month</p>
            </div>
          ))}
        </div>

        <div className="mt-[6%] flex items-baseline justify-between">
          <span className="font-semibold text-[#1a1215]" style={f(0.042)}>Recent Transactions</span>
          <span className="font-medium text-[#980042]" style={f(0.03)}>View All</span>
        </div>
        <div className="mt-[2%]">
          <Tx kind="food" title="Food & Groceries" sub="Spar VI, Chowdeck" amount="−₦310,400" right="Oct 8" />
          <Tx kind="transport" title="Transportation" sub="Bolt, InDrive" amount="−₦120,000" right="Oct 8" />
          <Tx kind="telecom" title="Telecom & Tech" sub="MTN 5G Fiber, AWS" amount="−₦50,000" right="Oct 2" />
        </div>
      </div>
      <TabBar active="overview" />
    </Screen>
  )
}

/* ───────────── 2. Analytics ───────────── */

export function AnalyticsScreen() {
  const weeks: [string, string, number, number][] = [
    ['Wk 1', 'Oct 1-7', 1.85, 0.9],
    ['Wk 2', '8-14', 0.75, 0.6],
    ['Wk 3', '15-21', 0.42, 0.36],
    ['Wk 4', '22-28', 0.72, 0.56],
    ['Wk 5', '29-31', 0.36, 0.3],
  ]
  return (
    <Screen>
      <TopBar title="Analytics" />
      <div className="px-[6%]">
        <div className="mt-[7%] flex items-center justify-between">
          <span className="text-[#5a5155]" style={f(0.03)}>Spending Overview</span>
          <span className="flex items-center gap-[4px] rounded-[8px] bg-[#f3f1f2] px-[3%] py-[1.5%] text-[#1a1215]" style={f(0.028)}>October <I n="chevron" k={0.03} className="rotate-90" /></span>
        </div>
        <p className="num mt-[3%] font-medium text-[#1a1215]" style={f(0.085)}>₦186,500.00</p>
        <p className="text-[#5a5155]" style={f(0.03)}>Total Spending in October</p>
        <div className="mt-[6%] flex justify-between border-t border-black/[0.08] pt-[4%]">
          <div>
            <p className="text-[#5a5155]" style={f(0.028)}>Daily Average</p>
            <p className="num font-semibold text-[#1a1215]" style={f(0.042)}>₦6,016.00</p>
          </div>
          <div className="text-right">
            <p className="text-[#5a5155]" style={f(0.028)}>Transactions</p>
            <p className="num font-semibold text-[#1a1215]" style={f(0.042)}>24</p>
          </div>
        </div>

        {/* Inflow and outflow by week */}
        <div className="relative mt-[6%] flex items-end gap-[4%] border-b border-black/[0.08] pl-[9%]" style={{ height: 'calc(var(--pw) * 0.42)' }}>
          {['₦2.0M', '₦1.5M', '₦1.0M', '₦500k', '₦0'].map((t, i) => (
            <span key={t} className="absolute left-0 text-[#a39a9e]" style={{ ...f(0.022), top: `${i * 24}%` }}>{t}</span>
          ))}
          <span className="absolute left-[38%] top-[8%] rounded-[4px] bg-[#ffd6e4] px-[2%] text-[#980042]" style={f(0.022)}>Optimal</span>
          {weeks.map(([w, , a, b]) => (
            <span key={w} className="flex flex-1 items-end justify-center gap-[10%]" style={{ height: '100%' }}>
              <span className="w-[34%] rounded-t-[3px] bg-[#980042]" style={{ height: `${(a / 2) * 100}%` }} />
              <span className="w-[34%] rounded-t-[3px] bg-[#1a1215]" style={{ height: `${(b / 2) * 100}%` }} />
            </span>
          ))}
        </div>
        <div className="flex gap-[4%] pl-[9%]">
          {weeks.map(([w, d]) => (
            <span key={w} className="flex-1 text-center">
              <span className="block font-semibold text-[#1a1215]" style={f(0.024)}>{w}</span>
              <span className="block text-[#a39a9e]" style={f(0.02)}>{d}</span>
            </span>
          ))}
        </div>
        <div className="mt-[4%] flex justify-center gap-[6%] rounded-full border border-black/[0.08] py-[2%]" style={f(0.026)}>
          <span className="flex items-center gap-[5px]"><span className="h-[6px] w-[6px] rounded-full bg-[#980042]" /> Inflow (₦3.95M)</span>
          <span className="flex items-center gap-[5px]"><span className="h-[6px] w-[6px] rounded-full bg-[#1a1215]" /> Outflow (₦1.85M)</span>
        </div>

        <p className="mt-[6%] font-semibold text-[#1a1215]" style={f(0.05)}>Category</p>
        <div className="mt-[2.5%] flex h-[6px] overflow-hidden rounded-full">
          <span className="bg-[#e8941f]" style={{ width: '46.2%' }} />
          <span className="bg-[#1f6b4f]" style={{ width: '28.1%' }} />
          <span className="bg-[#2b9bc9]" style={{ width: '14.3%' }} />
          <span className="bg-[#5b5bd6]" style={{ width: '7%' }} />
          <span className="bg-[#9aa0aa]" style={{ width: '4.4%' }} />
        </div>
        <div className="mt-[1.5%] flex justify-between font-semibold text-[#1a1215]" style={f(0.023)}>
          <span>Groceries 46.2%</span>
          <span>Transportation 28.1%</span>
          <span>Other 11.4%</span>
        </div>
        <div className="mt-[2%]">
          <Tx kind="food" title="Food & Groceries" sub="Spar VI, Chowdeck" amount="₦310,400" right="46.2%" />
          <Tx kind="transport" title="Transportation" sub="Bolt, InDrive" amount="₦120,000" right="28.1%" />
        </div>
      </div>
    </Screen>
  )
}

/* ───────────── 3. AI Insight ───────────── */

function InsightCard({ tag, tagBg, tagFg, icon, title, body, link }: { tag: string; tagBg: string; tagFg: string; icon: keyof typeof P; title: string; body: string; link: string }) {
  return (
    <div className="rounded-[calc(var(--pw)*0.04)] border border-black/[0.06] bg-white p-[4.5%] shadow-[0_4px_14px_-10px_rgb(0_0_0/0.25)]">
      <div className="flex items-start gap-[3.5%]">
        <span className="grid shrink-0 place-items-center rounded-[22%]" style={{ ...box(0.085), background: tagBg, color: tagFg }}>
          <I n={icon} k={0.042} />
        </span>
        <span className="min-w-0">
          <span className="inline-block rounded-[4px] px-[6px] py-[1px] font-semibold uppercase tracking-wide" style={{ ...f(0.022), background: tagBg, color: tagFg }}>{tag}</span>
          <span className="mt-[2px] block font-semibold text-[#1a1215]" style={f(0.034)}>{title}</span>
        </span>
      </div>
      <p className="mt-[3%] leading-snug text-[#4a4246]" style={f(0.029)}>{body}</p>
      <p className="mt-[3%] flex items-center justify-between font-semibold text-[#980042]" style={f(0.027)}>
        {link} <I n="chevron" k={0.035} />
      </p>
    </div>
  )
}

export function InsightScreen() {
  return (
    <Screen>
      <TopBar title="AI Insight" bell />
      <div className="px-[5%]">
        <div className="mt-[6%] overflow-hidden rounded-[calc(var(--pw)*0.03)] p-[5%] text-white" style={{ background: BRAND }}>
          <p className="flex items-center gap-[2%] font-semibold uppercase tracking-wide" style={f(0.034)}>
            <Sparkle k={0.045} /> Your monthly summary
          </p>
          <p className="mt-[2%] font-semibold" style={f(0.036)}>Here’s what your money is telling you.</p>
          <p className="mt-[3%] leading-snug text-white/85" style={f(0.027)}>Your spending is concentrated in Food & Groceries and Transportation. These categories make up the largest share of your October expenses.</p>
          <div className="mt-[5%] flex justify-between">
            <span>
              <span className="block text-white/75" style={f(0.025)}>Total spent</span>
              <span className="num block font-semibold" style={f(0.04)}>₦1,130,400</span>
            </span>
            <span className="text-right">
              <span className="block text-white/75" style={f(0.025)}>Top Category</span>
              <span className="block font-semibold" style={f(0.04)}>Food & Groceries</span>
            </span>
          </div>
        </div>

        <div className="mt-[5%] flex items-center gap-[3%] rounded-[calc(var(--pw)*0.035)] border border-black/[0.08] bg-white p-[2.5%] shadow-[0_6px_16px_-12px_rgb(0_0_0/0.3)]">
          <span className="grid place-items-center rounded-[25%] text-white" style={{ ...box(0.075), background: BRAND }}>
            <Sparkle k={0.04} />
          </span>
          <span className="flex-1 text-[#9a9195]" style={f(0.03)}>Ask FinWise anything</span>
          <span className="grid place-items-center rounded-full text-white" style={{ ...box(0.065), background: '#980042' }}>
            <I n="send" k={0.035} sw={2.2} />
          </span>
        </div>
        <p className="mt-[2%] inline-flex items-center gap-[4px] rounded-full bg-[#ffe9f1] px-[3%] py-[1%] text-[#980042]" style={f(0.024)}>
          <Sparkle k={0.028} /> What will my net worth be in Dec?
        </p>

        <p className="mt-[6%] font-semibold text-[#1a1215]" style={f(0.048)}>Insights for you</p>
        <p className="text-[#7a7175]" style={f(0.028)}>Based on your spending activity</p>
        <div className="mt-[4%] flex flex-col gap-[3%]">
          <InsightCard tag="Spending pattern" tagBg="#fff1dc" tagFg="#d9800f" icon="cart" title="Food & Groceries lead your expenses" body="You’ve spent ₦72,000 on groceries, around 38.6% of your total monthly spending." link="See category breakdown" />
          <InsightCard tag="Spending change" tagBg="#ffe8e1" tagFg="#e0533a" icon="trend" title="Keep an eye on transport" body="Transportation accounts for ₦38,500. Compare it with your previous month to see whether travel costs are rising." link="Compare months" />
        </div>
      </div>
    </Screen>
  )
}

/* ───────────── 4. Create Budget ───────────── */

export function BudgetScreen() {
  const cats: [string, keyof typeof P, boolean][] = [
    ['Groceries', 'cart', true],
    ['Transport', 'car', false],
    ['Bills & utilities', 'bolt', false],
    ['Airtime & data', 'phone', false],
    ['Other spending', 'dots', false],
  ]
  return (
    <Screen>
      <div className="px-[6%] pt-[16%]">
        <p className="flex items-center gap-[3%] font-semibold text-[#1a1215]" style={f(0.05)}>
          <I n="back" k={0.055} /> Create Budget
        </p>
        <p className="mt-[1%] pl-[9%] text-[#7a7175]" style={f(0.028)}>Set a spending limit and stay in control.</p>

        <div className="mt-[6%] rounded-[calc(var(--pw)*0.035)] bg-[#ffe3ec] p-[5%]">
          <p className="font-semibold uppercase tracking-wide text-[#980042]" style={f(0.026)}>Suggested weekly target</p>
          <p className="num mt-[2%] font-semibold text-[#1a1215]" style={f(0.06)}>₦16,000</p>
          <p className="mt-[2%] text-[#6a5f64]" style={f(0.026)}>Based on your recent grocery spending</p>
        </div>

        <div className="mt-[6%] flex justify-between" style={f(0.03)}>
          <span className="font-semibold text-[#1a1215]">Choose a category</span>
          <span className="text-[#980042]">5 available</span>
        </div>
        <div className="mt-[3%] grid grid-cols-2 gap-[3%]">
          {cats.map(([label, icon, on]) => (
            <span key={label} className={`flex items-center gap-[6%] rounded-[calc(var(--pw)*0.025)] p-[5%] ${on ? 'border-[1.5px] border-[#980042] bg-white' : 'bg-[#f4f2f3]'}`} style={f(0.029)}>
              <span className={on ? 'text-[#980042]' : 'text-[#5a5155]'}><I n={icon} k={0.045} /></span>
              <span className={`flex-1 ${on ? 'font-semibold text-[#980042]' : 'text-[#2a2226]'}`}>{label}</span>
              {on && (
                <span className="grid place-items-center rounded-full bg-[#980042] text-white" style={box(0.04)}>
                  <I n="check" k={0.026} sw={3} />
                </span>
              )}
            </span>
          ))}
        </div>

        <div className="mt-[6%] flex justify-between font-semibold uppercase tracking-wide text-[#7a7175]" style={f(0.024)}>
          <span>Budget limit</span>
          <span className="normal-case tracking-normal text-[#980042]">Tap to edit</span>
        </div>
        <div className="mt-[2%] flex items-center justify-between border-b border-black/[0.08] pb-[3%]">
          <span className="num font-semibold text-[#1a1215]" style={f(0.06)}>₦64,000</span>
          <span className="flex items-center gap-[6px] text-[#7a7175]" style={f(0.024)}>
            <span className="rounded-[4px] bg-[#f1eef0] px-[6px] py-[2px]">NGN</span>
            <I n="pencil" k={0.035} />
          </span>
        </div>

        <p className="mt-[5%] font-semibold uppercase tracking-wide text-[#7a7175]" style={f(0.024)}>Budget duration</p>
        <div className="mt-[2%] flex rounded-[calc(var(--pw)*0.025)] bg-[#f4f2f3] p-[1.2%]" style={f(0.03)}>
          <span className="flex-1 py-[2.5%] text-center text-[#5a5155]">Weekly</span>
          <span className="flex-1 rounded-[calc(var(--pw)*0.02)] bg-white py-[2.5%] text-center font-semibold text-[#980042] shadow-[0_2px_6px_rgb(0_0_0/0.08)]">Monthly</span>
        </div>

        <div className="mt-[5%] flex gap-[3%] rounded-[calc(var(--pw)*0.03)] bg-[#f4f2f3] p-[4%]" style={f(0.026)}>
          <span className="grid shrink-0 place-items-center rounded-full bg-[#ffe3ec] text-[#980042]" style={box(0.07)}><I n="trend" k={0.035} /></span>
          <span className="text-[#4a4246]">
            This is ₦8,000 below your recent average grocery spending of ₦72,000/month.
            <span className="mt-[2px] block text-[#980042]">• Estimated monthly savings: ₦8,000</span>
          </span>
        </div>

        <div className="mt-[5%] rounded-[calc(var(--pw)*0.03)] py-[4%] text-center font-semibold text-white" style={{ ...f(0.034), background: '#980042' }}>
          Create budget →
        </div>
      </div>
      <TabBar active="insights" />
    </Screen>
  )
}

/* ───────────── 5. Activity ───────────── */

export function ActivityScreen() {
  return (
    <Screen>
      <TopBar title="Activity" />
      <div className="px-[5.5%]">
        <div className="mt-[5%] flex items-start justify-between">
          <div>
            <p className="font-semibold text-[#1a1215]" style={f(0.058)}>Activity</p>
            <p className="text-[#7a7175]" style={f(0.028)}>Track your money in and out</p>
          </div>
          <span className="grid place-items-center rounded-full border border-black/10 text-[#1a1215]" style={box(0.085)}><I n="filter" k={0.042} /></span>
        </div>
        <div className="mt-[4%] flex items-center gap-[3%] rounded-[calc(var(--pw)*0.025)] border border-black/10 px-[4%] py-[3%] text-[#9a9195]" style={f(0.03)}>
          <I n="search" k={0.04} /> Search transactions
        </div>
        <div className="mt-[4%] flex gap-[2.5%]" style={f(0.028)}>
          <span className="rounded-full bg-[#980042] px-[5%] py-[1.5%] font-semibold text-white">All</span>
          <span className="rounded-full border border-black/10 px-[5%] py-[1.5%] text-[#2a2226]">Income</span>
          <span className="rounded-full border border-black/10 px-[5%] py-[1.5%] text-[#2a2226]">Expenses</span>
        </div>
        <div className="mt-[4%] grid grid-cols-2 gap-[3%]">
          {[
            ['Money in', '₦420,000', '#1f8a5b', 'down' as const],
            ['Money out', '₦186,500', '#e0533a', 'up' as const],
          ].map(([l, v, c, a]) => (
            <div key={l} className="rounded-[calc(var(--pw)*0.03)] border border-black/[0.08] p-[6%]">
              <p className="flex items-center gap-[6%] text-[#4a4246]" style={f(0.028)}>
                <span className="grid place-items-center rounded-full" style={{ ...box(0.06), color: c, background: `${c}1a` }}><I n={a as 'down' | 'up'} k={0.032} sw={2.2} /></span>
                {l}
              </p>
              <p className="num mt-[8%] font-semibold" style={{ ...f(0.046), color: c }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-[5%] flex items-baseline justify-between">
          <span className="font-semibold text-[#1a1215]" style={f(0.044)}>Recent transactions</span>
          <span className="font-medium text-[#980042]" style={f(0.028)}>See all</span>
        </div>
        <p className="mt-[2%] font-semibold uppercase tracking-wide text-[#9a9195]" style={f(0.023)}>Today</p>
        <Tx kind="food" title="Food & Groceries" sub="Spar VI, Chowdeck" amount="−₦310,400" right="Oct 8" />
        <Tx kind="transport" title="Transportation" sub="Bolt, InDrive" amount="−₦120,000" right="Oct 8" />
        <p className="mt-[2%] font-semibold uppercase tracking-wide text-[#9a9195]" style={f(0.023)}>Yesterday</p>
        <Tx kind="telecom" title="Freelance" sub="Transfer received · May 14" amount="+₦95,000" positive />
        <Tx kind="airtime" title="MTN Airtime" sub="Airtime & data · May 14" amount="−₦2,000" />
      </div>
      <TabBar active="activities" />
    </Screen>
  )
}

type Row = { icon: keyof typeof P | 'sparkle'; tint: string; bg: string; title: string; sub: string }

/** The white card that pops out over the phone, highlighting one thing on the current screen. */
export function FloatCard({ rows }: { rows: Row[] }) {
  return (
    <div className="w-[280px] rounded-[18px] bg-white p-2 text-left shadow-[0_24px_50px_-18px_rgb(40_0_17/0.55)]">
      {rows.map((r, i) => (
        <div key={r.title} className={`flex items-center gap-3 rounded-[12px] p-2.5 ${i ? 'border-t border-black/[0.05]' : ''}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: r.bg, color: r.tint, ['--pw' as string]: '200px' }}>
            {r.icon === 'sparkle' ? <Sparkle k={0.1} /> : <I n={r.icon} k={0.1} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#1a1215]">{r.title}</span>
            <span className="block truncate text-[11px] text-[#8a8185]">{r.sub}</span>
          </span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#b3a9ad]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </div>
      ))}
    </div>
  )
}

export const SLIDES: { screen: ReactNode; title: string; body: string; rows: Row[]; lightTop?: boolean }[] = [
  {
    screen: <OverviewScreen />,
    title: 'Your money at a glance',
    body: 'Balance, income, expenses and your latest transactions, all in one place.',
    rows: [
      { icon: 'down', tint: '#1f8a5b', bg: '#e2f3ea', title: 'Income ₦3,850,000', sub: '+12.4% more than last month' },
      { icon: 'up', tint: '#3a3f4b', bg: '#eceef1', title: 'Expenses ₦1,920,400', sub: 'Within your safe limit' },
    ],
  },
  {
    screen: <AnalyticsScreen />,
    lightTop: true,
    title: 'See where it all went',
    body: 'Weekly money in and out, and which categories take the biggest share.',
    rows: [
      { icon: 'cart', tint: '#e08a1e', bg: '#fdecd6', title: 'Food & Groceries 46.2%', sub: '₦310,400 this month' },
      { icon: 'car', tint: '#1f8a5b', bg: '#e2f3ea', title: 'Transportation 28.1%', sub: '₦120,000 this month' },
    ],
  },
  {
    screen: <InsightScreen />,
    lightTop: true,
    title: 'Insights made for you',
    body: 'A monthly summary from your own spending, with practical next steps.',
    rows: [{ icon: 'sparkle', tint: '#980042', bg: '#ffe9f1', title: 'Your AI insight', sub: 'Spending is 12% higher than last month' }],
  },
  {
    screen: <BudgetScreen />,
    lightTop: true,
    title: 'Budgets in a few taps',
    body: 'Pick a category and a limit, and FinWise alerts you at 80% of it.',
    rows: [
      { icon: 'cart', tint: '#980042', bg: '#ffe9f1', title: 'Groceries ₦64,000', sub: 'Monthly budget' },
      { icon: 'bell', tint: '#d9800f', bg: '#fff1dc', title: 'Alert at 80%', sub: 'Before you go over' },
    ],
  },
  {
    screen: <ActivityScreen />,
    lightTop: true,
    title: 'Every naira, in and out',
    body: 'Search and filter everything that came in or went out.',
    rows: [
      { icon: 'down', tint: '#1f8a5b', bg: '#e2f3ea', title: 'Money in ₦420,000', sub: 'This month' },
      { icon: 'up', tint: '#e0533a', bg: '#fde8e3', title: 'Money out ₦186,500', sub: 'This month' },
    ],
  },
]
