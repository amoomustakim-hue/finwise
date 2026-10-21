import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Arrow, Reveal, useSeen, Words } from './kit'
import { HomeScreen, LockScreen, Mark, Phone } from './Phone'
import { BrandField } from './Story'

/* ─────────────────────────── Categories marquee ─────────────────────────── */

const CATS = ['Food', 'Rent', 'Airtime & Data', 'Transportation', 'Salary', 'Bills & Utilities', 'Family & Friends', 'Inventory & supplies', 'Staff salaries', 'Customer payment', 'Marketing', 'Savings', 'Bank charges', 'Owner’s pay']

export function Marquee() {
  const row = [...CATS, ...CATS]
  return (
    <div className="relative overflow-hidden border-y border-black/[0.07] bg-white py-5">
      <div className="marquee gap-3">
        {row.map((c, i) => (
          <span key={i} className="flex shrink-0 items-center gap-3 rounded-full bg-[var(--paper)] px-5 py-2.5 text-[14px] font-medium text-[var(--ink-2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
            {c}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}

/* ─────────────────────────── Feature stack ─────────────────────────── */

function Sorted() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.4)
  const rows = [
    ['POS PURCHASE IKEJA 0412', '₦4,500', 'Food'],
    ['MTN VTU 08031234567', '₦2,000', 'Airtime & Data'],
    ['TRF TO EMEKA O. RENT OCT', '₦120,000', 'Rent'],
    ['BOLT NG TRIP 77AF', '₦3,200', 'Transportation'],
    ['SALARY OCT ACME LTD', '+₦380,000', 'Salary'],
  ]
  return (
    <div ref={ref} className="flex flex-col gap-2.5">
      {rows.map(([raw, amt, cat], i) => (
        <div key={raw} className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 shadow-[0_8px_20px_-14px_rgb(79_0_34/0.35)]">
          <div className="min-w-0">
            <p className="truncate font-mono text-[12px] text-[var(--muted)]">{raw}</p>
            <span
              className="mt-1.5 inline-block rounded-full bg-[var(--blush)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--brand)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateX(-12px)', transitionDelay: `${300 + i * 180}ms` }}
            >
              {cat}
            </span>
          </div>
          <span className={`num shrink-0 text-[15px] font-semibold ${amt.startsWith('+') ? 'text-[var(--good)]' : ''}`}>{amt}</span>
        </div>
      ))}
    </div>
  )
}

function Meters() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.4)
  const rows: [string, number, string, string, string][] = [
    ['Food', 0.82, '#f2a516', 'Likely to go over', '₦49,200 of ₦60,000'],
    ['Transportation', 0.45, '#1f9d6b', 'On track', '₦13,500 of ₦30,000'],
    ['Airtime & Data', 1, '#ff6a3d', 'Over budget', '₦16,400 of ₦15,000'],
    ['Entertainment', 0.3, '#1f9d6b', 'On track', '₦6,000 of ₦20,000'],
  ]
  return (
    <div ref={ref} className="flex flex-col gap-5 rounded-[24px] bg-white p-6 shadow-[0_12px_30px_-18px_rgb(79_0_34/0.4)]">
      {rows.map(([n, v, c, l, sub], i) => (
        <div key={n}>
          <div className="flex items-baseline justify-between text-[14px]">
            <span className="font-semibold">{n}</span>
            <span className="font-medium" style={{ color: c }}>{l}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f3e9ed]">
            <div className="h-full rounded-full transition-[width] duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: seen ? `${v * 100}%` : '0%', background: c, transitionDelay: `${200 + i * 150}ms` }} />
          </div>
          <p className="num mt-1.5 text-[12px] text-[var(--muted)]">{sub}</p>
        </div>
      ))}
    </div>
  )
}

function InsightCard() {
  return (
    <div className="rounded-[24px] bg-white p-6 shadow-[0_12px_30px_-18px_rgb(79_0_34/0.4)]">
      <p className="eyebrow text-[var(--brand)]">Insight</p>
      <p className="mt-3 text-[21px] font-semibold leading-snug tracking-[-0.02em]">Food is heading over budget</p>
      <p className="mt-2 text-[15px] text-[var(--ink-2)]">Spend ₦1,500 less a day for the rest of October and you’ll land on budget.</p>
      <div className="mt-5 rounded-[18px] bg-[var(--paper)] p-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">Why we’re saying this</p>
        <ul className="mt-2 space-y-1.5 text-[14px] text-[var(--ink-2)]">
          <li>• ₦49,200 spent on Food so far, 21 days in</li>
          <li>• Your budget is ₦60,000 for the month</li>
          <li>• At this pace October ends near ₦72,600</li>
        </ul>
      </div>
      <span className="pill-brand mt-5 !h-11 !text-[14px]">Adjust Food budget</span>
    </div>
  )
}

function ModeFlip() {
  const [biz, setBiz] = useState(false)
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex rounded-full bg-white p-1 shadow-[0_8px_20px_-12px_rgb(79_0_34/0.4)]">
        {['Personal', 'Business'].map((m, i) => (
          <button key={m} type="button" onClick={() => setBiz(i === 1)} className={`h-10 rounded-full px-5 text-[14px] font-medium transition-all duration-300 ${biz === (i === 1) ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink-2)]'}`}>
            {m}
          </button>
        ))}
      </div>
      <div className="[perspective:1400px]">
        <div className="transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] [--pw:230px] [transform-style:preserve-3d]" style={{ transform: `rotateY(${biz ? 360 : 0}deg)` }}>
          <Phone>
            <HomeScreen key={biz ? 'b' : 'p'} mode={biz ? 'business' : 'personal'} />
          </Phone>
        </div>
      </div>
    </div>
  )
}

const FEATURES: { k: string; title: string; body: string; visual: ReactNode; id?: string }[] = [
  { k: '01', title: 'Every naira, sorted.', body: 'Connect your bank or drop in a statement. Cryptic bank lines become Food, Rent, Data and Salary on their own, and when FinWise isn’t sure, it simply asks you.', visual: <Sorted /> },
  { k: '02', title: 'Budgets that warn you early.', body: 'Not after you’ve overspent. Each budget shows whether you’re on track, likely to go over, or already over, based on how fast you’re spending this month.', visual: <Meters /> },
  { k: '03', title: 'Advice that shows its working.', body: 'Every insight comes with the numbers behind it and one practical next step. No vague tips, nothing you can’t check.', visual: <InsightCard /> },
  { k: '04', title: 'Personal and business. One app.', body: 'Run a side business or a shop? Switch to Business for sales by weekday, costs, and what you paid yourself, kept apart from your personal money.', visual: <ModeFlip />, id: 'business' },
]

export function FeatureStack() {
  return (
    <section className="relative px-4 pb-10 pt-24 sm:px-8 lg:pt-32">
      <div className="mx-auto max-w-[1240px]">
        <Reveal className="max-w-[760px]">
          <p className="eyebrow text-[var(--brand)]">What it does</p>
          <h2 className="mt-4 text-[clamp(36px,5vw,64px)] font-semibold leading-[1.04] tracking-[-0.04em]">Everything your bank app never told you.</h2>
        </Reveal>
        <div className="mt-14 flex flex-col gap-6">
          {FEATURES.map((f, i) => (
            <article
              key={f.k}
              id={f.id}
              className="sticky grid items-center gap-8 overflow-hidden rounded-[32px] border border-white bg-[linear-gradient(160deg,#ffffff,#fbf3f6)] p-6 shadow-[0_30px_60px_-30px_rgb(79_0_34/0.35)] sm:p-10 lg:min-h-[480px] lg:grid-cols-2 lg:p-14"
              style={{ top: `calc(84px + ${i * 18}px)` }}
            >
              <div>
                <span className="num text-[14px] font-semibold text-[var(--brand)]">{f.k}</span>
                <h3 className="mt-4 text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em]">{f.title}</h3>
                <p className="mt-4 max-w-[440px] text-[16px] leading-relaxed text-[var(--ink-2)]">{f.body}</p>
              </div>
              <div className="relative">{f.visual}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Notifications ─────────────────────────── */

export function Notifications() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.35)
  const [answered, setAnswered] = useState(false)
  return (
    <section className="relative overflow-hidden px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-2">
        <div ref={ref} className="order-2 flex justify-center lg:order-1">
          <div className="relative [--pw:min(290px,74vw)]">
            <div aria-hidden="true" className="absolute -inset-16 rounded-full bg-[radial-gradient(closest-side,rgb(152_0_66/0.25),transparent)]" />
            <Phone dark>
              {seen && (
                <LockScreen
                  answered={answered}
                  onAnswer={() => setAnswered(true)}
                  items={[
                    { title: 'Is this Food?', body: '₦4,500 · POS purchase, Ikeja', time: 'now', ask: true },
                    { title: 'Salary landed', body: '+₦380,000 from Acme Ltd', time: '9:02' },
                    { title: 'Heads up', body: 'Airtime & Data is over budget', time: 'Mon' },
                  ]}
                />
              )}
            </Phone>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="eyebrow text-[var(--brand)]">Notifications</p>
          <h2 className="mt-4 text-[clamp(36px,5vw,64px)] font-semibold leading-[1.04] tracking-[-0.04em]">“Is this Food?”</h2>
          <Words className="mt-6 max-w-[520px] text-[clamp(20px,2.2vw,26px)] font-medium leading-snug tracking-[-0.01em]" text="When money moves, FinWise asks one quick question. Answer it from your lock screen and your month stays accurate without you ever opening a spreadsheet." />
          <p className="mt-6 text-[14px] text-[var(--muted)]">Try it: tap “Yes, Food” on the phone.</p>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Trust ─────────────────────────── */

export function Trust() {
  const items = [
    ['Read only', 'Your bank connects through Mono. FinWise can see transactions. It cannot send, move or spend money.'],
    ['Or no connection at all', 'Prefer not to link a bank? Upload a CSV or PDF statement from your banking app instead.'],
    ['Numbers you can trace', 'Every figure comes from your own transactions, and every insight shows the facts behind it.'],
  ]
  return (
    <section className="relative overflow-hidden px-5 py-24 text-white sm:px-8 lg:py-32">
      <BrandField />
      <div className="relative mx-auto max-w-[1240px]">
        <Reveal>
          <p className="eyebrow text-white/60">Your money stays yours</p>
          <h2 className="mt-4 text-[clamp(44px,8vw,112px)] font-semibold leading-[0.98] tracking-[-0.045em]">
            We can read.
            <br />
            <span className="text-white/45">We can’t spend.</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {items.map(([t, b], i) => (
            <Reveal key={t} delay={i * 120} className="glass-dark rounded-[26px] p-7">
              <span className="icon-glass h-11 w-11 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {i === 0 ? <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></> : i === 1 ? <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 14h6M9 17h4" /></> : <><path d="M4 19h16M7 16V9M12 16V5M17 16v-4" /></>}
                </svg>
              </span>
              <p className="mt-5 text-[19px] font-semibold">{t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/75">{b}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Full-bleed story ─────────────────────────── */

/** Swap in a real photo by adding public/landing/story.webp; until then a soft portrait of light. */
export function StoryPhoto() {
  return (
    <section className="relative px-3 py-3 sm:px-5">
      <div className="relative mx-auto flex min-h-[86svh] max-w-[1400px] items-end overflow-hidden rounded-[36px] p-6 text-white sm:p-12">
        <div aria-hidden="true" className="absolute inset-0 bg-[#3a0019] bg-cover bg-[position:70%_30%]" style={{ backgroundImage: 'url(/landing/story.webp), radial-gradient(60% 70% at 72% 35%, #c2185b 0%, #710131 45%, #3a0019 100%)' }} />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgb(58_0_25/0.92)_0%,rgb(58_0_25/0.55)_40%,rgb(58_0_25/0)_75%)]" />
        <Reveal className="relative max-w-[760px]">
          <p className="text-[14px] font-medium text-white/75">Meet Ada · Salary on the 25th, Mama Nkechi Foods on the side</p>
          <p className="mt-4 text-[clamp(28px,3.8vw,50px)] font-semibold leading-[1.12] tracking-[-0.03em]">
            “I used to find out I was broke on the 20th. Now I know on the 1st, and I still have time to do something about it.”
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/try" className="pill-white">
              Explore FinWise as Ada <Arrow />
            </Link>
            <span className="text-[13px] text-white/65">Ada is our demo account. Her story and numbers are sample data.</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────────────────── FAQ ─────────────────────────── */

const FAQS = [
  ['Can FinWise move my money?', 'No. Bank connections through Mono are read only: FinWise sees your transactions and balance, and has no way to send or spend money. You can also skip linking entirely and upload a statement.'],
  ['Which banks work?', 'Connect through Mono, which works with Nigerian banks, or upload a CSV or PDF statement exported from your banking app.'],
  ['How does the Decision Simulator work?', 'It looks at your last three full months: your regular money (like salary and rent) on its usual day, and your average daily spending. Then it replays the next 60 days with and without your decision. It’s an estimate with its assumptions shown, never a guarantee.'],
  ['What if a transaction is sorted wrong?', 'Change it in a tap. When FinWise isn’t sure about a transaction it asks you instead of guessing, from the app or straight from a notification.'],
  ['Can I use it for my business?', 'Yes. Turn on Business to see sales, costs, sales by weekday and what you paid yourself, kept separate from your personal money.'],
  ['Can I try it before signing up?', 'Yes. The demo opens a private sample account as Ada, with a salary and a small food business, so you can explore every screen.'],
]

export function Faq() {
  return (
    <section id="faq" className="relative overflow-hidden px-5 py-24 text-white sm:px-8 lg:py-32">
      <div aria-hidden="true" className="absolute inset-0 bg-[#2a0012]" />
      <BrandField className="opacity-50" />
      <div className="relative mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <h2 className="text-[clamp(36px,4.6vw,58px)] font-semibold leading-[1.04] tracking-[-0.04em]">
            Frequently
            <br />
            asked questions
          </h2>
          <p className="mt-4 max-w-[340px] text-[15px] text-white/65">Straight answers about your money, your bank and how FinWise works it all out.</p>
        </Reveal>
        <div className="divide-y divide-white/12 border-y border-white/12">
          {FAQS.map(([q, a], i) => (
            <details key={q} className="group" open={i === 0}>
              <summary className="flex items-center justify-between gap-6 py-6 text-[17px] font-medium sm:text-[19px]">
                {q}
                <span className="faq-plus grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 text-[20px] font-light">+</span>
              </summary>
              <div className="faq-body">
                <div className="overflow-hidden">
                  <p className="max-w-[620px] pb-6 text-[15px] leading-relaxed text-white/70">{a}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Finale ─────────────────────────── */

export function Finale() {
  return (
    <section className="relative px-5 pb-10 pt-24 sm:px-8 lg:pt-32">
      <div className="mx-auto max-w-[1240px] text-center">
        <Reveal>
          <h2 className="mx-auto max-w-[900px] text-[clamp(42px,7vw,96px)] font-semibold leading-[1] tracking-[-0.045em]">
            Your next 60 days,
            <br />
            <span className="bg-[linear-gradient(115deg,#4f0022,#980042_70%)] bg-clip-text text-transparent">before they happen.</span>
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="pill-brand">
              Get started <Arrow />
            </Link>
            <Link to="/try" className="pill-line">Try the demo</Link>
          </div>
        </Reveal>
      </div>
      <footer className="mx-auto mt-28 max-w-[1400px] border-t border-black/10 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4 text-[14px] text-[var(--muted)]">
          <span className="flex items-center gap-2.5 font-semibold text-[var(--ink)]">
            <Mark className="h-7 w-7" /> FinWise
          </span>
          <nav className="flex flex-wrap gap-6">
            <a href="#how" className="hover:text-[var(--ink)]">How it works</a>
            <a href="#simulator" className="hover:text-[var(--ink)]">Simulator</a>
            <a href="#faq" className="hover:text-[var(--ink)]">FAQ</a>
            <Link to="/signin" className="hover:text-[var(--ink)]">Sign in</Link>
          </nav>
          <span>Personal and business money, in naira.</span>
        </div>
        <p aria-hidden="true" className="mt-10 select-none text-center text-[clamp(80px,22vw,330px)] font-semibold leading-[0.8] tracking-[-0.06em] bg-[linear-gradient(180deg,#980042,rgb(152_0_66/0.06))] bg-clip-text text-transparent">
          FinWise
        </p>
      </footer>
    </section>
  )
}
