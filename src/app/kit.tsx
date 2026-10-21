// Shared look for the signed-in app (Rejoice's designs): icons, category styles, rows and headers.
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

/* ───────────── Icons ───────────── */

const PATHS = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.4 6.5C3.6 8.3 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2',
  chevron: 'm9 6 6 6-6 6',
  chevronDown: 'm6 9 6 6 6-6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  up: 'M12 19V5M6 11l6-6 6 6',
  cart: 'M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2M9 20h.01M17 20h.01',
  car: 'M5 16V11l1.8-4.2A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.8 1.3L19 11v5M5 16h14M5 16v2M19 16v2M7.5 13h.01M16.5 13h.01M5 11h14',
  signal: 'M12 13v8M8.5 9.5a5 5 0 0 1 7 0M6 7a8.5 8.5 0 0 1 12 0M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  bank: 'M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6z',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  home: 'M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  bag: 'M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c1-3.3 3.5-5 6.5-5s5.5 1.7 6.5 5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 15.2c1.4.7 2.4 2.4 3 4.8',
  coins: 'M8 8a5 2.5 0 1 0 10 0A5 2.5 0 1 0 8 8zM8 8v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V8M6 13v4c0 1.4 2.2 2.5 5 2.5 1.2 0 2.3-.2 3.2-.6',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  piggy: 'M5 11a7 6 0 0 1 12-3l3-1-1 3a6 6 0 0 1 1 3v2h-2l-1 3h-3v-2H9v2H6l-1-4H3v-3z',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  box: 'M4 8 12 4l8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  megaphone: 'M4 10v4h3l7 4V6L7 10zM18 9a4 4 0 0 1 0 6',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7M12 17h.01',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  filter: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  check: 'M5 12.5 10 17l9-10',
  send: 'M12 19V6M6 11l6-6 6 6',
  trend: 'M4 16l5-5 4 4 7-7M15 8h5v5',
  trendDown: 'M4 8l5 5 4-4 7 7M15 16h5v-5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  bars: 'M6 20V10M12 20V4M18 20v-7',
  brain: 'M12 5a3 3 0 0 0-5.6 1.5A3 3 0 0 0 5 12a3 3 0 0 0 2 5 3 3 0 0 0 5 1V5zM12 5a3 3 0 0 1 5.6 1.5A3 3 0 0 1 19 12a3 3 0 0 1-2 5 3 3 0 0 1-5 1',
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.5 2.5L16 9.5',
  calendar: 'M7 3v3M17 3v3M4 9h16M5 5h14v15H5z',
  alert: 'M12 4 2.5 20h19zM12 10v4M12 17v.5',
  logout: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l4-4-4-4M14 12H4',
  x: 'M6 6l12 12M18 6 6 18',
  store: 'M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5',
} as const
export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'h-5 w-5', stroke = 1.8 }: { name: IconName; className?: string; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Sparkle({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" />
      <path d="M18 13.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5zM18.5 2.5c.2 1 .6 1.4 1.5 1.5-.9.2-1.3.6-1.5 1.5-.2-.9-.6-1.3-1.5-1.5.9-.1 1.3-.5 1.5-1.5z" />
    </svg>
  )
}

/* ───────────── Categories ───────────── */

type Style = { icon: IconName; fg: string; bg: string; bar: string }
const S = (icon: IconName, fg: string, bg: string, bar = fg): Style => ({ icon, fg, bg, bar })
const GREEN = ['#1f8a5b', '#e2f3ea'] as const

const CATEGORY: Record<string, Style> = {
  Food: S('cart', '#e08a1e', '#fdecd6', '#e8941f'),
  Groceries: S('cart', '#d9800f', '#fff1dc', '#f2b33d'),
  Transportation: S('car', '#1f8a5b', '#e2f3ea', '#1f6b4f'),
  'Transportation & logistics': S('car', '#1f8a5b', '#e2f3ea', '#1f6b4f'),
  Rent: S('home', '#6b4fd6', '#ece8fd', '#6b4fd6'),
  'Bills & Utilities': S('bolt', '#d64545', '#fde4e4'),
  Utilities: S('bolt', '#d64545', '#fde4e4'),
  'Airtime & Data': S('signal', '#2b9bc9', '#e3f3fb'),
  Subscriptions: S('repeat', '#3a6fd8', '#e6eefd'),
  Shopping: S('bag', '#c2185b', '#fde6ef'),
  Entertainment: S('film', '#8a3fd1', '#f1e7fb'),
  Health: S('heart', '#e0533a', '#fde8e3'),
  'Family & Friends': S('users', '#c98a00', '#fff3d6'),
  'Bank charges': S('bank', '#5a5f6b', '#eceef1'),
  'Other expense': S('dots', '#5a5f6b', '#eceef1'),
  'Inventory & supplies': S('box', '#e08a1e', '#fdecd6', '#e8941f'),
  'Staff salaries': S('users', '#6b4fd6', '#ece8fd'),
  Marketing: S('megaphone', '#c2185b', '#fde6ef'),
  'Tax & levies': S('receipt', '#5a5f6b', '#eceef1'),
  'Personal expense': S('user', '#c98a00', '#fff3d6'),
  Salary: S('bank', ...GREEN),
  "Owner's pay": S('bank', ...GREEN),
  'Customer payment': S('store', ...GREEN),
  'Gift / Support received': S('heart', ...GREEN),
  'Other income': S('down', ...GREEN),
  'Loan received': S('coins', '#3a6fd8', '#e6eefd'),
  'Loan or owner capital': S('coins', '#3a6fd8', '#e6eefd'),
  Refund: S('undo', ...GREEN),
  Savings: S('piggy', '#c2185b', '#fde6ef'),
  'Own-account transfer': S('swap', '#5a5f6b', '#eceef1'),
  "Owner's withdrawal": S('up', '#5a5f6b', '#eceef1'),
}
const PENDING: Style = S('question', '#c98a00', '#fff3d6')

export function categoryStyle(category: string | null): Style {
  return (category && CATEGORY[category]) || (category ? S('dots', '#5a5f6b', '#eceef1') : PENDING)
}

export function CategoryIcon({ category, size = 'h-11 w-11' }: { category: string | null; size?: string }) {
  const s = categoryStyle(category)
  return (
    <span className={`grid shrink-0 place-items-center rounded-[12px] ${size}`} style={{ background: s.bg, color: s.fg }}>
      <Icon name={s.icon} className="h-5 w-5" />
    </span>
  )
}

/* ───────────── Money and dates ───────────── */

const ngn0 = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })
const ngn2 = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** ₦12,345 from kobo; `cents` shows ₦12,345.00 like the balance in the designs. */
export const naira = (kobo: number, cents = false) => `${kobo < 0 ? '−' : ''}₦${(cents ? ngn2 : ngn0).format(Math.abs(kobo) / 100)}`
export const signed = (kobo: number, credit: boolean) => `${credit ? '+' : '−'}${naira(kobo)}`
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).replace(/(\d+) (\w+)/, '$2 $1')
export const monthLabel = (ym: string, withYear = false) =>
  new Date(`${ym}-01T12:00:00Z`).toLocaleString('en-GB', { month: 'long', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' })

/* ───────────── Pieces ───────────── */

export type Tx = {
  id: string
  occurred_at: string
  amount_kobo: number
  direction: 'credit' | 'debit'
  narration: string
  category: string | null
  category_status: 'pending' | 'suggested' | 'confirmed'
  kind: string | null
  source: 'mono' | 'import' | 'demo' | 'manual'
  bank_name: string
}

/** Readable merchant line from a raw bank narration. */
export const merchant = (n: string) => n.replace(/\s+/g, ' ').trim()

/** One transaction, as in the designs: category icon, category name, the merchant, amount and date. */
export function TxRow({ t, to, byMerchant = false }: { t: Tx; to?: string; byMerchant?: boolean }) {
  const credit = t.direction === 'credit'
  const pending = t.category_status === 'pending'
  const body = (
    <div className="flex items-center gap-3.5 py-3">
      <CategoryIcon category={pending ? null : t.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">
          {byMerchant ? merchant(t.narration) : pending ? 'What was this for?' : t.category}
          {!byMerchant && t.category_status === 'suggested' && <span className="ml-1.5 align-middle text-[11px] font-normal text-[#9a9195]">suggested</span>}
        </p>
        <p className="truncate text-[12px] text-[#8a8185]">{byMerchant ? t.bank_name : merchant(t.narration)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[14px] font-semibold ${credit ? 'text-[#1f8a5b]' : 'text-[#e0533a]'}`}>{signed(t.amount_kobo, credit)}</p>
        <p className="text-[12px] text-[#8a8185]">{shortDate(t.occurred_at)}</p>
      </div>
    </div>
  )
  return to ? (
    <Link to={to} className="block transition hover:bg-black/[0.02]">
      {body}
    </Link>
  ) : (
    body
  )
}

/** Back arrow + centred title, as on every inner screen in the designs. */
export function PageHeader({ title, back = '/home', right }: { title: string; back?: string | false; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="mb-5 grid grid-cols-[40px_1fr_40px] items-center lg:mb-7 lg:grid-cols-[1fr_auto]">
      {back !== false ? (
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(back))}
          className="grid h-10 w-10 place-items-center rounded-full text-[#1a1215] hover:bg-black/5 lg:hidden"
          aria-label="Back"
        >
          <Icon name="back" />
        </button>
      ) : (
        <span className="lg:hidden" />
      )}
      <h1 className="text-center text-[17px] font-semibold lg:text-left lg:text-[26px] lg:tracking-[-0.02em]">{title}</h1>
      <span className="flex justify-end">{right}</span>
    </div>
  )
}

export function SectionHead({ title, link }: { title: string; link?: { label: string; to: string } }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {link && (
        <Link to={link.to} className="text-[13px] font-medium text-brand">
          {link.label}
        </Link>
      )}
    </div>
  )
}

export const card = 'rounded-[18px] bg-white ring-1 ring-black/[0.06]'

export function Empty({ title, body, action }: { title: string; body: string; action?: { label: string; to: string } }) {
  return (
    <div className={`${card} p-8 text-center`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-[14px] text-[#7a7175]">{body}</p>
      {action && (
        <Link to={action.to} className="mt-4 inline-block rounded-[12px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white">
          {action.label}
        </Link>
      )}
    </div>
  )
}
