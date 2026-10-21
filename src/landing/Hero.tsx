import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Arrow, Count } from './kit'
import { HomeScreen, Mark, Phone } from './Phone'

export function Nav() {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const on = () => setSolid(scrollY > 30)
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div className={`mx-auto flex h-16 max-w-[1240px] items-center justify-between rounded-full pl-5 pr-2 transition-all duration-500 ${solid ? 'glass' : ''}`}>
        <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <Mark className="h-8 w-8" />
          <span className="text-[19px]">FinWise</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] font-medium text-[var(--ink-2)] md:flex">
          <a href="#how" className="transition-colors hover:text-[var(--ink)]">How it works</a>
          <a href="#simulator" className="transition-colors hover:text-[var(--ink)]">Simulator</a>
          <a href="#business" className="transition-colors hover:text-[var(--ink)]">For business</a>
          <a href="#faq" className="transition-colors hover:text-[var(--ink)]">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/signin" className="hidden px-4 text-[14px] font-semibold sm:block">Sign in</Link>
          <Link to="/signup" className="pill-ink !h-11 !px-5 !text-[14px]">Get started</Link>
        </div>
      </div>
    </header>
  )
}

/** Small glass notes that orbit the phone. */
function Chip({ className, children, delay }: { className: string; children: React.ReactNode; delay: number }) {
  return (
    <div className={`absolute z-20 ${className}`}>
      <div className="bob" style={{ animationDelay: `${delay % 1000}ms` }}>
        <div className="rise glass rounded-[20px] px-4 py-3 text-[13px]" style={{ animationDelay: `${delay}ms` }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const stage = useRef<HTMLDivElement>(null)
  const phone = useRef<HTMLDivElement>(null)

  // The phone leans toward the pointer and settles back as you scroll away.
  useEffect(() => {
    const el = phone.current
    const st = stage.current
    if (!el || !st) return
    let tx = 0, ty = 0, cx = 0, cy = 0, f = 0
    const move = (e: PointerEvent) => {
      const r = st.getBoundingClientRect()
      tx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 16
      ty = ((e.clientY - (r.top + r.height / 2)) / r.height) * -12
    }
    const loop = () => {
      cx += (tx - cx) * 0.08
      cy += (ty - cy) * 0.08
      const s = Math.min(1, scrollY / innerHeight)
      el.style.transform = `perspective(1400px) rotateY(${cx - 8 + s * 8}deg) rotateX(${cy + 4 - s * 4}deg) rotateZ(${4 - s * 4}deg) translateY(${s * 60}px)`
      f = requestAnimationFrame(loop)
    }
    addEventListener('pointermove', move, { passive: true })
    f = requestAnimationFrame(loop)
    return () => {
      removeEventListener('pointermove', move)
      cancelAnimationFrame(f)
    }
  }, [])

  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-28 sm:px-8 lg:pb-24 lg:pt-36">
      {/* soft light behind the phone */}
      <div aria-hidden="true" className="pointer-events-none absolute right-[-10vw] top-[-10vh] h-[80vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,rgb(152_0_66/0.22),rgb(152_0_66/0))]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[18vw] top-[30vh] h-[60vh] w-[40vw] rounded-full bg-[radial-gradient(closest-side,rgb(255_201_220/0.55),rgb(255_201_220/0))]" />

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="rise glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium" style={{ animationDelay: '100ms' }}>
            <span className="relative flex h-2 w-2">
              <span className="ping absolute inset-0 rounded-full bg-[var(--brand)]/60" />
              <span className="relative h-2 w-2 rounded-full bg-[var(--brand)]" />
            </span>
            Built for money in naira
          </p>
          <h1 className="mt-6 text-[clamp(44px,7.2vw,92px)] font-semibold leading-[1.02] tracking-[-0.04em]">
            {['See next month', 'before you', 'live it.'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <span className="rise block" style={{ animationDelay: `${200 + i * 120}ms` }}>
                  {i === 2 ? (
                    <>
                      <span className="bg-[linear-gradient(115deg,#4f0022,#980042_70%)] bg-clip-text text-transparent">live it.</span>
                    </>
                  ) : (
                    line
                  )}
                </span>
              </span>
            ))}
          </h1>
          <p className="rise mt-6 max-w-[520px] text-[17px] leading-relaxed text-[var(--ink-2)] sm:text-[18px]" style={{ animationDelay: '600ms' }}>
            FinWise reads your bank activity, sorts every naira, and shows you what the next 60 days look like. Ask “can I afford it?” before you spend, not after.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '720ms' }}>
            <Link to="/signup" className="pill-brand">
              Get started <Arrow />
            </Link>
            <Link to="/try" className="pill-line">Try the demo</Link>
          </div>
          <p className="rise mt-5 text-[13px] text-[var(--muted)]" style={{ animationDelay: '820ms' }}>
            No sign-up for the demo. Explore as Ada, with sample data.
          </p>

          <dl className="rise mt-12 grid max-w-[560px] grid-cols-3 gap-6 border-t border-black/10 pt-8" style={{ animationDelay: '900ms' }}>
            {[
              [60, ' days', 'of your future, projected'],
              [3, ' months', 'of your history behind every number'],
              [2, ' in 1', 'personal and business money'],
            ].map(([n, unit, label]) => (
              <div key={label as string}>
                <dt className="text-[clamp(28px,3.4vw,40px)] font-semibold leading-none tracking-[-0.03em]">
                  <Count to={n as number} />
                  <span className="text-[0.55em] font-medium text-[var(--muted)]">{unit as string}</span>
                </dt>
                <dd className="mt-2 text-[13px] leading-snug text-[var(--muted)]">{label as string}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div ref={stage} className="relative mx-auto flex h-[640px] w-full max-w-[520px] items-center justify-center sm:h-[720px]">
          <div className="rise" style={{ animationDelay: '300ms', animationDuration: '1.4s' }}>
            <div ref={phone} className="will-change-transform [--pw:min(300px,72vw)] sm:[--pw:320px]">
              <Phone>
                <HomeScreen />
              </Phone>
            </div>
          </div>
          <Chip className="left-0 top-[14%] sm:-left-6" delay={1100}>
            <p className="font-semibold text-[var(--good)]">+₦380,000</p>
            <p className="text-[var(--muted)]">Salary landed</p>
          </Chip>
          <Chip className="right-0 top-[40%] sm:-right-8" delay={1350}>
            <p className="font-semibold">Is this Food?</p>
            <p className="text-[var(--muted)]">₦4,500 · POS purchase</p>
            <div className="mt-2 flex gap-1.5 text-[12px] font-semibold">
              <span className="rounded-full bg-[var(--brand)] px-3 py-1 text-white">Yes</span>
              <span className="rounded-full bg-white px-3 py-1">Change</span>
            </div>
          </Chip>
          <Chip className="bottom-[10%] left-0 sm:-left-10" delay={1600}>
            <p className="flex items-center gap-2 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[var(--danger)]" /> Heads up
            </p>
            <p className="max-w-[190px] text-[var(--muted)]">At this pace you could run short on the 2nd.</p>
          </Chip>
        </div>
      </div>
    </section>
  )
}
