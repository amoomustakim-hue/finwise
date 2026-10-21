import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Arrow, Count, Reveal } from './kit'
import { linePath, naira, project, VERDICT, type What } from './model'
import { HomeScreen, LockScreen, Mark, Phone } from './Phone'

/* ─────────────────────────── Icons ─────────────────────────── */

const ICONS = {
  calendar: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
  split: 'M4 6h7v12H4zM13 6h7v5h-7zM13 13h7v5h-7z',
  alert: 'M12 4 2.5 20h19zM12 10v4M12 17v.5',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  coins: 'M8 8a5 2.5 0 1 0 10 0A5 2.5 0 1 0 8 8zM8 8v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V8M6 13v4c0 1.4 2.2 2.5 5 2.5 1.2 0 2.3-.2 3.2-.6',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  check: 'M5 12.5 10 17l9-10',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  slider: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  shield: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z',
}
function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

/* ─────────────────────────── Proof strip ─────────────────────────── */

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 24 48" className={`h-10 w-5 text-[var(--muted)] ${flip ? '-scale-x-100' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M18 44C8 38 5 26 9 6" />
      {[10, 17, 24, 31, 38].map((y, i) => (
        <path key={y} d={`M${9 + i * 0.6} ${y} q-6 -1 -7 -6 q6 0 7 6z`} />
      ))}
    </svg>
  )
}

const SAYS: { icon: keyof typeof ICONS; tint: string; quote: string; from: string }[] = [
  { icon: 'alert', tint: '#f2a516', quote: 'Food is heading over budget. Spend ₦1,500 less a day to land on it.', from: 'Budgets' },
  { icon: 'sun', tint: '#980042', quote: 'Saturdays bring your best sales. Restock on Friday so you don’t run out.', from: 'Business insights' },
  { icon: 'bell', tint: '#1f9d6b', quote: 'Is this Food? ₦4,500 at a POS in Ikeja. Tap once and it’s sorted.', from: 'Notifications' },
  { icon: 'coins', tint: '#4f0022', quote: 'You can afford it, but it’s tight: your lowest point would be ₦31,000 on the 24th.', from: 'Decision Simulator' },
]

export function Proof() {
  return (
    <section className="bg-white px-5 pb-24 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <Reveal className="flex items-center justify-center gap-2">
          <Laurel />
          <div className="text-center">
            <p className="text-[11px] text-[var(--muted)]">Read-only bank access</p>
            <p className="text-[14px] font-semibold">Your money can’t move</p>
          </div>
          <Laurel flip />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-[760px] grid-cols-3 gap-4 text-center">
          {[
            { icon: 'calendar' as const, n: 60, unit: ' days', label: 'projected ahead', c: '#980042' },
            { icon: 'history' as const, n: 3, unit: ' months', label: 'of your history used', c: '#c2185b' },
            { icon: 'split' as const, n: 2, unit: ' in 1', label: 'personal and business', c: '#f2a516' },
          ].map((s) => (
            <Reveal key={s.label} className="flex flex-col items-center">
              <span style={{ color: s.c }}>
                <Icon name={s.icon} className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[clamp(22px,3vw,30px)] font-medium tracking-[-0.02em]">
                <Count to={s.n} />
                {s.unit}
              </p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">{s.label}</p>
            </Reveal>
          ))}
        </div>

        <p className="mt-14 text-center text-[13px] font-medium text-[var(--muted)]">Things FinWise will tell you</p>
        <div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {SAYS.map((s, i) => (
            <Reveal key={s.from} delay={i * 80} className="flex w-[78%] shrink-0 snap-center flex-col items-center rounded-[18px] border border-black/[0.07] bg-white px-5 py-6 text-center sm:w-auto">
              <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: s.tint }}>
                <Icon name={s.icon} className="h-4 w-4" />
              </span>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink-2)]">“{s.quote}”</p>
              <p className="mt-3 text-[13px] font-semibold">{s.from}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Feature blocks ─────────────────────────── */

type BlockProps = {
  id?: string
  tag: string
  title: ReactNode
  body: string[]
  cta: { label: string; to: string }
  cardTitle: string
  cardBody: string
  points: { icon: keyof typeof ICONS; text: string }[]
  phone?: ReactNode
  flip?: boolean
  children?: ReactNode
}

function Block({ id, tag, title, body, cta, cardTitle, cardBody, points, phone, flip = false, children }: BlockProps) {
  return (
    <section id={id} className="bg-white px-5 py-12 sm:px-8 lg:py-16">
      <div className={`mx-auto grid max-w-[1080px] items-center gap-10 lg:gap-16 ${flip ? 'lg:grid-cols-[1.2fr_0.8fr]' : 'lg:grid-cols-[0.8fr_1.2fr]'}`}>
        <Reveal className={flip ? 'lg:order-2' : ''}>
          <span className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">{tag}</span>
          <h2 className="mt-5 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.12] tracking-[-0.03em]">{title}</h2>
          {body.map((p) => (
            <p key={p} className="mt-4 max-w-[400px] text-[15px] leading-relaxed text-[var(--ink-2)]">{p}</p>
          ))}
          <Link to={cta.to} className="mt-7 inline-flex rounded-[12px] bg-[var(--ink)] px-5 py-3 text-[13px] font-semibold text-white">
            {cta.label}
          </Link>
        </Reveal>

        <Reveal delay={120} className={`relative overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#fff5f8,#fbe4ed)] p-7 sm:p-10 ${phone ? 'min-h-[440px]' : ''} ${flip ? 'lg:order-1' : ''}`}>
          <div className={phone ? 'relative z-10 sm:max-w-[54%]' : ''}>
            <h3 className="text-[20px] font-medium tracking-[-0.01em]">{cardTitle}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-2)]">{cardBody}</p>
            <ul className="mt-6 space-y-3.5">
              {points.map((pt) => (
                <li key={pt.text} className="flex items-start gap-3 text-[14px] text-[var(--ink)]">
                  <span className="mt-0.5 text-[var(--brand)]">
                    <Icon name={pt.icon} className="h-[18px] w-[18px]" />
                  </span>
                  {pt.text}
                </li>
              ))}
            </ul>
            {children}
          </div>
          {phone && (
            <div className="pointer-events-none relative mx-auto -mb-48 mt-8 rotate-[-6deg] [--pw:220px] sm:absolute sm:-bottom-[34%] sm:right-[-4%] sm:m-0">
              <Phone>{phone}</Phone>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}

type SimTab = { id: string; label: string; min: number; max: number; step: number; def: number; make: (v: number) => What; show: (v: number) => string }
const SIM_TABS: SimTab[] = [
  { id: 'buy', label: 'Buy something', min: 20_000, max: 900_000, step: 10_000, def: 250_000, make: (v) => ({ kind: 'purchase', amount: v, inDays: 3 }), show: (v) => naira(v) },
  { id: 'late', label: 'Salary late', min: 0, max: 21, step: 1, def: 10, make: (v) => ({ kind: 'late', days: v }), show: (v) => `${v} days late` },
  { id: 'hire', label: 'Hire someone', min: 30_000, max: 400_000, step: 5_000, def: 150_000, make: (v) => ({ kind: 'hire', monthly: v }), show: (v) => `${naira(v)} a month` },
]

/** The working simulator, sized for a feature card. */
function SimulatorCard() {
  const [ti, setTi] = useState(0)
  const tab = SIM_TABS[ti]
  const [v, setV] = useState(tab.def)
  const base = useMemo(() => project(null), [])
  const run = useMemo(() => project(tab.make(v)), [tab, v])
  const min = Math.min(...base.series, ...run.series, 0)
  const max = Math.max(...base.series, ...run.series)
  const W = 400, H = 90
  const zeroY = H - ((0 - min) / (max - min)) * H
  const verdict = VERDICT[run.verdict]
  return (
    <div className="mt-7 rounded-[20px] bg-white p-5 shadow-[0_14px_30px_-18px_rgb(79_0_34/0.35)]">
      <div className="flex flex-wrap gap-1.5">
        {SIM_TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTi(i)
              setV(t.def)
            }}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${i === ti ? 'bg-[var(--ink)] text-white' : 'bg-[#f6eef2] text-[var(--ink-2)]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
        <p className="num text-[26px] font-semibold tracking-[-0.02em]">{tab.show(v)}</p>
        <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#f6eef2] px-2.5 py-1 text-[11px] font-semibold">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: verdict.dot }} />
          {verdict.label}
        </span>
      </div>
      <input
        type="range"
        aria-label={tab.label}
        className="range-light mt-3"
        min={tab.min}
        max={tab.max}
        step={tab.step}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        style={{ ['--p' as string]: `${((v - tab.min) / (tab.max - tab.min)) * 100}%` }}
      />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-4 h-[80px] w-full overflow-visible">
        <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="#980042" strokeOpacity="0.25" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        <path d={linePath(base.series, W, H, min, max)} fill="none" stroke="#d6c4cb" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        <path d={linePath(run.series, W, H, min, max)} fill="none" stroke="#980042" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="num mt-2 text-[12px] text-[var(--muted)]">
        Lowest point {naira(run.lowest)} on {run.cal[run.lowAt].label} · sample numbers
      </p>
    </div>
  )
}

export function Features() {
  return (
    <div id="features">
      <Block
        id="simulator"
        tag="Decision Simulator"
        title={
          <>
            Ask before
            <br />
            you spend.
          </>
        }
        body={['Thinking of a new phone, a staff member, or wondering what happens if your salary is late?', 'Move the slider and FinWise replays your next 60 days with that decision, using your own last three months.']}
        cta={{ label: 'Try the demo', to: '/try' }}
        cardTitle="Can I afford it?"
        cardBody="A straight answer, with the lowest point your balance would reach."
        points={[
          { icon: 'slider', text: 'Purchases, late salary, new hires, rising costs' },
          { icon: 'check', text: 'Looks manageable, tight, or you could run short' },
        ]}
      >
        <SimulatorCard />
      </Block>

      <Block
        flip
        tag="Budgets and insights"
        title={
          <>
            Know before
            <br />
            you overspend.
          </>
        }
        body={['Connect your bank through Mono or upload a statement. Every transaction is sorted into Food, Rent, Data and the rest.', 'Budgets warn you while there’s still time, and every insight shows the numbers behind it.']}
        cta={{ label: 'Get started', to: '/signup' }}
        cardTitle="Stay on top of the month"
        cardBody="Where your money went and where it’s going, in plain words."
        points={[
          { icon: 'list', text: 'Every naira sorted into clear categories' },
          { icon: 'alert', text: 'On track, likely to go over, or over budget' },
          { icon: 'check', text: 'One practical next step with every insight' },
        ]}
        phone={<HomeScreen />}
      />

      <Block
        id="business"
        tag="For business"
        title={
          <>
            Personal and
            <br />
            business, one app.
          </>
        }
        body={['Run a shop or a side business? Switch to Business and keep it apart from your personal money.', 'See sales, costs, your best days of the week, and what you paid yourself.']}
        cta={{ label: 'Get started', to: '/signup' }}
        cardTitle="Mama Nkechi Foods"
        cardBody="Ada’s food business, the way FinWise shows it."
        points={[
          { icon: 'sun', text: 'Sales by weekday, so you restock at the right time' },
          { icon: 'coins', text: 'What you paid yourself, not counted as a cost' },
          { icon: 'split', text: 'Switch between Personal and Business in a tap' },
        ]}
        phone={<HomeScreen mode="business" />}
      />

      <Block
        flip
        tag="Notifications"
        title={<>“Is this Food?”</>}
        body={['When money moves, FinWise asks one quick question. Answer from your lock screen and your month stays accurate.', 'No spreadsheets, no end-of-month sorting.']}
        cta={{ label: 'Try the demo', to: '/try' }}
        cardTitle="One tap and it’s sorted"
        cardBody="FinWise only asks when it isn’t sure."
        points={[
          { icon: 'bell', text: 'A question when a payment needs a category' },
          { icon: 'check', text: 'Answer straight from the notification' },
          { icon: 'shield', text: 'It reads your transactions; it can’t move money' },
        ]}
        phone={<LockScreen answered={false} onAnswer={() => {}} items={[{ title: 'Is this Food?', body: '₦4,500 · POS purchase, Ikeja', time: 'now', ask: true }, { title: 'Salary landed', body: '+₦380,000 from Acme Ltd', time: '9:02' }]} />}
      />
    </div>
  )
}

/* ─────────────────────────── FAQ ─────────────────────────── */

const FAQS = [
  ['Can FinWise move my money?', 'No. Bank connections through Mono are read only: FinWise sees your transactions and balance, and has no way to send or spend money. You can also skip linking and upload a statement.'],
  ['Which banks work?', 'Connect through Mono, which works with Nigerian banks, or upload a CSV or PDF statement from your banking app.'],
  ['How does the Decision Simulator work?', 'It looks at your last three full months: your regular money (like salary and rent) on its usual day, and your average daily spending. Then it replays the next 60 days with and without your decision. It’s an estimate with its assumptions shown, never a guarantee.'],
  ['What if a transaction is sorted wrong?', 'Change it in a tap. When FinWise isn’t sure, it asks you instead of guessing.'],
  ['Can I try it before signing up?', 'Yes. The demo opens a private sample account as Ada, with a salary and a small food business.'],
]

export function Faq() {
  return (
    <section id="faq" className="bg-white px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto grid max-w-[1080px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <span className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">FAQs</span>
          <h2 className="mt-5 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.12] tracking-[-0.03em]">Questions, answered.</h2>
          <p className="mt-4 max-w-[340px] text-[15px] text-[var(--ink-2)]">Still unsure? Open the demo and look around as Ada.</p>
        </Reveal>
        <div className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
          {FAQS.map(([q, a]) => (
            <details key={q}>
              <summary className="flex items-center justify-between gap-6 py-5 text-[15px] font-medium sm:text-[16px]">
                {q}
                <span className="faq-plus grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f6eef2] text-[16px]">+</span>
              </summary>
              <div className="faq-body">
                <div className="overflow-hidden">
                  <p className="max-w-[560px] pb-5 text-[14px] leading-relaxed text-[var(--ink-2)]">{a}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Closing ─────────────────────────── */

export function Closing() {
  return (
    <>
      <section className="relative overflow-hidden px-5 sm:px-8">
        <img src="/landing/sky-band.webp" alt="" className="absolute inset-0 h-full w-full object-cover [filter:brightness(1.07)_saturate(1.15)]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,#fff_0%,rgb(255_255_255/0)_30%,rgb(255_255_255/0)_70%,#fff_100%)]" />
        <Reveal className="relative mx-auto max-w-[760px] py-32 text-center sm:py-40">
          <h2 className="text-[clamp(34px,5vw,58px)] font-semibold leading-[1.08] tracking-[-0.04em]">Your next 60 days, before they happen.</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            <Link to="/signup" className="rounded-[14px] bg-[var(--ink)] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_12px_24px_-10px_rgb(0_0_0/0.55)]">
              Get started free
            </Link>
            <Link to="/try" className="inline-flex items-center gap-1.5 text-[14px] font-semibold">
              Try the demo <Arrow />
            </Link>
          </div>
        </Reveal>
      </section>
      <footer className="bg-white px-5 pb-10 pt-6 sm:px-8">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-4 border-t border-black/[0.08] pt-8 text-[13px] text-[var(--muted)]">
          <span className="flex items-center gap-2 font-semibold text-[var(--ink)]">
            <Mark className="h-6 w-6" /> FinWise
          </span>
          <nav className="flex flex-wrap gap-6">
            <a href="#features" className="hover:text-[var(--ink)]">Features</a>
            <a href="#simulator" className="hover:text-[var(--ink)]">Simulator</a>
            <a href="#faq" className="hover:text-[var(--ink)]">FAQs</a>
            <Link to="/signin" className="hover:text-[var(--ink)]">Sign in</Link>
          </nav>
          <span>Personal and business money, in naira.</span>
        </div>
      </footer>
    </>
  )
}
