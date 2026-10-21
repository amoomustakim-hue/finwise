// Sign in, sign up and onboarding share this frame: a brand panel with a photo on the left,
// the form on the right. Separate from components/ui.tsx so the app screens stay as they are.
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
import './landing.css'
import { Mark, Phone } from './Phone'
import { FloatCard, SLIDES } from './Screens'

const ICON = {
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5',
  store: 'M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5',
}
export function FieldIcon({ name }: { name: keyof typeof ICON }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON[name]} />
    </svg>
  )
}

const EVERY_MS = 3000

/**
 * The app, introduced one screen at a time: the top of the phone, a card that pops out over it,
 * and a title, line and dots underneath. Moves on every 3 seconds; pauses while hovered.
 */
function Slideshow() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = SLIDES.length
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setI((x) => (x + 1) % n), EVERY_MS)
    return () => clearTimeout(t)
  }, [i, paused, n])
  const slide = SLIDES[i]

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-10 pb-10 pt-20" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative [--pw:min(290px,22vw,33svh)]">
        <div aria-hidden="true" className="absolute -inset-x-24 -top-10 bottom-0 rounded-full bg-[radial-gradient(closest-side,rgb(255_150_190/0.35),transparent)]" />
        {/* Only the top of the phone shows, fading out like the reference */}
        <div className="relative overflow-hidden [mask-image:linear-gradient(180deg,#000_70%,transparent)]" style={{ height: 'calc(var(--pw) * 2.167 * 0.66)' }}>
          <Phone darkStatus={!!slide.lightTop}>
            {SLIDES.map((sl, k) => {
              const d = (k - i + n) % n
              const x = d === 0 ? 0 : d === 1 ? 100 : d === n - 1 ? -100 : 100
              const animate = d === 0 || d === n - 1
              return (
                <div key={k} className="absolute inset-0" style={{ transform: `translateX(${x}%)`, transition: animate ? 'transform 700ms cubic-bezier(0.22,1,0.36,1)' : 'none' }} aria-hidden={d !== 0}>
                  {sl.screen}
                </div>
              )
            })}
          </Phone>
        </div>
        <div key={i} className="rise absolute -right-[52%] top-[40%] z-10">
          <FloatCard rows={slide.rows} />
        </div>
      </div>

      <div key={`t${i}`} className="rise mt-6 min-h-[112px] max-w-[420px] text-center text-white">
        <p className="text-[clamp(24px,2.2vw,32px)] font-semibold leading-tight tracking-[-0.02em]">{slide.title}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-white/80">{slide.body}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {SLIDES.map((sl, k) => (
          <button key={sl.title} type="button" onClick={() => setI(k)} aria-label={`Show ${sl.title}`} className={`h-2 rounded-full transition-all duration-500 ${k === i ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`} />
        ))}
      </div>
    </div>
  )
}

/** The brand panel. Shows public/auth/woman.webp if it exists, otherwise the app slideshow. */
function BrandPanel() {
  const [photo, setPhoto] = useState(true)
  return (
    <aside className="relative hidden overflow-hidden rounded-[28px] lg:block" style={{ background: 'var(--brand-grad)' }}>
      <Link to="/" className="absolute left-8 top-8 z-20 flex items-center gap-2.5 text-white">
        <Mark className="h-8 w-8 rounded-[9px] ring-1 ring-white/50" />
        <span className="text-[18px] font-semibold tracking-tight">FinWise</span>
      </Link>
      {photo ? (
        <>
          <img src="/auth/woman.webp" alt="" onError={() => setPhoto(false)} className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(58_0_25/0.35)_0%,rgb(58_0_25/0)_30%,rgb(58_0_25/0.15)_55%,rgb(58_0_25/0.92)_100%)]" />
          <div className="absolute inset-x-8 bottom-8 text-white">
            <p className="max-w-[440px] text-[clamp(28px,2.6vw,38px)] font-semibold leading-[1.1] tracking-[-0.03em]">See next month before you live it.</p>
            <p className="mt-3 max-w-[400px] text-[15px] text-white/80">Understand where your money goes, see what’s coming, and act before it becomes a problem.</p>
          </div>
        </>
      ) : (
        <Slideshow />
      )}
    </aside>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: '#fff' }} className="lp min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-3 lg:p-3">
      <BrandPanel />

      {/* Phones get a small brand header instead of the panel */}
      <div className="relative overflow-hidden rounded-b-[28px] px-6 pb-10 pt-8 text-white lg:hidden" style={{ background: 'var(--brand-grad)' }}>
        <Link to="/" className="flex items-center gap-2.5">
          <Mark className="h-8 w-8 rounded-[9px] ring-1 ring-white/50" />
          <span className="text-[18px] font-semibold tracking-tight">FinWise</span>
        </Link>
        <p className="mt-8 max-w-[300px] text-[26px] font-semibold leading-[1.12] tracking-[-0.03em]">See next month before you live it.</p>
      </div>

      <main className="flex items-start justify-center px-6 pb-12 pt-8 lg:items-center lg:py-12">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  )
}

export function AuthTitle({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
      {sub && <p className="mt-2 text-[15px] text-[var(--muted)]">{sub}</p>}
    </div>
  )
}

/** A soft input with a leading icon; password fields get a show/hide toggle. */
export function Field({ label, icon, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; icon: keyof typeof ICON }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[var(--ink-2)]">{label}</span>
      <span className="group relative flex items-center">
        <span className="pointer-events-none absolute left-4 text-[#a99aa1] transition-colors group-focus-within:text-[var(--brand)]">
          <FieldIcon name={icon} />
        </span>
        <input
          type={isPassword && show ? 'text' : type}
          className="h-14 w-full rounded-[14px] border border-transparent bg-[#f6f2f4] pl-11 pr-12 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[#b6a9af] hover:bg-[#f2ecef] focus:border-[var(--brand)] focus:bg-white focus:shadow-[0_0_0_4px_rgb(152_0_66/0.1)]"
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 grid h-8 w-8 place-items-center rounded-full text-[#a99aa1] hover:text-[var(--ink)]" aria-label={show ? 'Hide password' : 'Show password'}>
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {show && <path d="M4 4l16 16" />}
            </svg>
          </button>
        )}
      </span>
    </label>
  )
}

export function Submit(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`mt-2 h-14 w-full rounded-[14px] text-[15px] font-semibold text-white shadow-[0_14px_28px_-12px_rgb(152_0_66/0.6)] transition hover:brightness-110 disabled:opacity-60 ${props.className ?? ''}`}
      style={{ background: 'var(--brand-grad)' }}
    />
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-[12px] bg-[#fff1ef] px-4 py-3 text-[14px] text-[#b42318]">
      {children}
    </p>
  )
}

/** "or" divider with the no-sign-up demo. */
export function DemoLink() {
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-[12px] text-[var(--muted)]">
        <span className="h-px flex-1 bg-black/10" />
        or
        <span className="h-px flex-1 bg-black/10" />
      </div>
      <Link to="/try" className="flex h-14 w-full items-center justify-center rounded-[14px] border border-black/10 text-[15px] font-semibold text-[var(--ink)] transition hover:bg-[#faf7f8]">
        Try the demo, no sign-up
      </Link>
    </>
  )
}
