import { Link } from 'react-router'
import { Arrow, Count } from './kit'
import { HomeScreen, Mark, Phone } from './Phone'

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[var(--paper)]">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <Mark className="h-8 w-8" />
          <span className="text-[19px]">FinWise</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] font-medium text-[var(--ink-2)] md:flex">
          <a href="#simulator" className="hover:text-[var(--ink)]">Simulator</a>
          <a href="#features" className="hover:text-[var(--ink)]">Features</a>
          <a href="#business" className="hover:text-[var(--ink)]">For business</a>
          <a href="#faq" className="hover:text-[var(--ink)]">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/signin" className="hidden px-4 text-[14px] font-semibold sm:block">Sign in</Link>
          <Link to="/signup" className="pill-brand !h-11 !px-5 !text-[14px]">Get started</Link>
        </div>
      </div>
    </header>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-16 sm:px-8 lg:pt-24">
      <div className="mx-auto max-w-[880px] text-center">
        <h1 className="text-[clamp(42px,6.8vw,84px)] font-semibold leading-[1.04] tracking-[-0.04em]">
          See next month
          <br />
          before you <span className="text-[var(--brand)]">live it.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[600px] text-[17px] leading-relaxed text-[var(--ink-2)] sm:text-[18px]">
          FinWise reads your bank activity, sorts every naira, and shows you what the next 60 days look like. Ask “can I afford it?” before you spend, not after.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="pill-brand">
            Get started <Arrow />
          </Link>
          <Link to="/try" className="pill-line">Try the demo</Link>
        </div>
        <p className="mt-4 text-[13px] text-[var(--muted)]">No sign-up for the demo. Explore as Ada, with sample data.</p>

        <dl className="mx-auto mt-12 grid max-w-[620px] grid-cols-3 gap-6">
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

      {/* The phone, under the words */}
      <div className="relative mx-auto mt-16 flex justify-center">
        <div aria-hidden="true" className="absolute left-1/2 top-[10%] h-[70%] w-[min(700px,90vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(152_0_66/0.16),rgb(152_0_66/0))]" />
        <div className="relative [--pw:min(320px,78vw)]">
          <Phone>
            <HomeScreen />
          </Phone>
        </div>
      </div>
    </section>
  )
}
