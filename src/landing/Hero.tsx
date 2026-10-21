import { Link } from 'react-router'
import { Arrow } from './kit'
import { HomeScreen, Mark, Phone } from './Phone'

const LINKS = [
  ['Features', '#features'],
  ['Simulator', '#simulator'],
  ['For business', '#business'],
  ['FAQs', '#faq'],
] as const

/** Light nav that sits on the sky; the first link wears the small black pill, as in the reference. */
export function Nav() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 border-b border-white/60">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Mark className="h-7 w-7" />
          <span className="text-[17px]">FinWise</span>
        </Link>
        <nav className="hidden items-center gap-1 text-[13px] font-medium text-[var(--ink-2)] md:flex">
          {LINKS.map(([label, href], i) => (
            <a key={href} href={href} className={`rounded-full px-3.5 py-1.5 transition-colors ${i === 0 ? 'bg-[var(--ink)] text-white' : 'hover:bg-white/60 hover:text-[var(--ink)]'}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link to="/signup" className="rounded-[12px] bg-[var(--ink)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgb(0_0_0/0.5)]">
            Get started
          </Link>
          <Link to="/signin" className="hidden text-[13px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)] sm:block">
            Sign in
          </Link>
        </div>
      </div>
    </header>
  )
}

function Platform({ d, label }: { d: string; label: string }) {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[var(--ink-2)] shadow-[0_2px_8px_rgb(0_0_0/0.08)]" title={label}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-label={label}>
        <path d={d} />
      </svg>
    </span>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* The sky: tall crop on phones, wide on larger screens */}
      <picture>
        <source media="(min-width: 768px)" srcSet="/landing/sky-wide.webp" />
        <img src="/landing/sky-tall.webp" alt="" className="absolute inset-0 h-full w-full object-cover [filter:brightness(1.07)_saturate(1.15)]" />
      </picture>
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/0.05)_0%,rgb(255_255_255/0)_45%,rgb(255_255_255/0.55)_80%,#fff_100%)]" />

      {/* Faint blueprint lines */}
      <div aria-hidden="true" className="guides hidden md:block">
        <span className="v" style={{ left: 'max(24px, calc(50% - 566px))' }} />
        <span className="v" style={{ right: 'max(24px, calc(50% - 566px))' }} />
        <span className="v" style={{ left: 'calc(50% - 320px)', top: '64px', bottom: '57%' }} />
        <span className="v" style={{ left: 'calc(50% + 320px)', top: '64px', bottom: '57%' }} />
        <span className="h" style={{ top: '43%' }} />
      </div>

      <div className="relative mx-auto max-w-[1180px] px-5 pt-36 text-center sm:px-8 sm:pt-40">
        <h1 className="mx-auto max-w-[760px] text-[clamp(40px,6.4vw,72px)] font-semibold leading-[1.06] tracking-[-0.04em] text-[var(--ink)]">
          See next month before you live it.
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-relaxed text-[var(--ink-2)] sm:text-[17px]">
          FinWise sorts every naira you spend and shows you the next 60 days, so you can ask “can I afford it?” before you pay.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          <Link to="/signup" className="rounded-[14px] bg-[var(--ink)] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_12px_24px_-10px_rgb(0_0_0/0.55)]">
            Get started free
          </Link>
          <Link to="/try" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ink)]">
            Try the demo <Arrow />
          </Link>
        </div>

        {/* The phone, standing straight and rising out of the clouds */}
        <div className="relative mx-auto mt-14 h-[min(560px,128vw)] overflow-hidden sm:h-[600px]">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 text-left [--pw:min(300px,74vw)] sm:[--pw:320px]">
            <div aria-hidden="true" className="absolute -inset-x-20 top-10 h-[80%] rounded-full bg-[radial-gradient(closest-side,rgb(152_0_66/0.18),transparent)]" />
            <Phone>
              <HomeScreen />
            </Phone>
          </div>
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white" />
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-3 bg-white pb-16 pt-2">
        <div className="flex gap-2.5">
          <Platform label="Android" d="M7 9h10v8a1 1 0 0 1-1 1h-1v2.5a1.5 1.5 0 0 1-3 0V18h-1v2.5a1.5 1.5 0 0 1-3 0V18H7a1 1 0 0 1-1-1zm-2.5 0A1.5 1.5 0 0 1 6 10.5v4a1.5 1.5 0 0 1-3 0v-4A1.5 1.5 0 0 1 4.5 9zm15 0a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-3 0v-4A1.5 1.5 0 0 1 19.5 9zM7.2 8a5 5 0 0 1 2.6-3.9L9 2.7l.6-.3.9 1.4a5 5 0 0 1 3 0l.9-1.4.6.3-.8 1.4A5 5 0 0 1 16.8 8z" />
          <Platform label="iPhone" d="M16.4 12.6c0-2 1.7-3 1.8-3a3.9 3.9 0 0 0-3-1.6c-1.3-.1-2.5.7-3.1.7s-1.6-.7-2.7-.7a4 4 0 0 0-3.4 2.1c-1.5 2.5-.4 6.3 1 8.4.7 1 1.5 2.1 2.6 2s1.4-.6 2.7-.6 1.6.6 2.7.6 1.8-1 2.5-2a8 8 0 0 0 1.1-2.3 3.6 3.6 0 0 1-2.2-3.6zM14.3 6.5A3.6 3.6 0 0 0 15.1 4a3.7 3.7 0 0 0-2.4 1.2 3.4 3.4 0 0 0-.9 2.4 3 3 0 0 0 2.5-1.1z" />
          <Platform label="Web" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-3a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4a14 14 0 0 1 1.9 4h-3.8A14 14 0 0 1 12 4zM4.3 14a8.3 8.3 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2h3a15.6 15.6 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16zm3-8h-3a8 8 0 0 1 4.4-3.6A15.6 15.6 0 0 0 8.1 8zM12 20a14 14 0 0 1-1.9-4h3.8A14 14 0 0 1 12 20zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.2 5.6a15.6 15.6 0 0 0 1.4-3.6h3a8 8 0 0 1-4.4 3.6zm1.8-5.6a16.5 16.5 0 0 0 0-4h3.4a8.3 8.3 0 0 1 0 4z" />
        </div>
        <p className="text-[12px] text-[var(--muted)]">Install it on Android or iPhone, or use it on the web</p>
      </div>
    </section>
  )
}
