// Two signature moments: the scroll that runs the calendar forward, and the simulator card.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Arrow } from './kit'
import { days, linePath, naira, nairaK, project, VERDICT, type What } from './model'

/** Deep magenta backdrop with slow-moving light. */
export function BrandField({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`aurora pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ background: 'var(--brand-grad)' }}>
      <span style={{ left: '-15vw', top: '-20vh', width: '60vw', height: '60vw', background: 'radial-gradient(closest-side, rgb(255 90 160 / 0.35), transparent)' }} />
      <span style={{ right: '-20vw', top: '10vh', width: '55vw', height: '55vw', background: 'radial-gradient(closest-side, rgb(40 0 17 / 0.55), transparent)' }} />
      <span style={{ left: '20vw', bottom: '-30vh', width: '60vw', height: '60vw', background: 'radial-gradient(closest-side, rgb(255 201 220 / 0.18), transparent)' }} />
    </div>
  )
}

/* ─────────────────────────── The calendar ─────────────────────────── */

const SPAN = 45
/** Ada's story: salary is due on day 4 and doesn't come; FinWise warns her; it lands on day 18. */
function storyLines() {
  const cal = days(SPAN)
  const nothing: number[] = [] // if nothing changes and the salary stays late
  const acted: number[] = [] // what Ada actually did after the warning
  let a = 312_000, b = 312_000
  for (let i = 0; i < SPAN; i++) {
    const spend = cal[i].dow === 6 || cal[i].dow === 0 ? 9_000 : 6_500
    a -= spend
    b -= i >= 4 ? spend - 2_000 : spend
    if (i === 7) a -= 40_000 // family support, paused by Ada
    if (i === 10) { a -= 120_000; b -= 120_000 } // rent share
    if (i === 18) b += 380_000 // the late salary
    nothing.push(a)
    acted.push(b)
  }
  return { cal, nothing, acted }
}

export function Calendar() {
  const wrap = useRef<HTMLDivElement>(null)
  const [p, setP] = useState(0)
  const { cal, nothing, acted } = useMemo(() => storyLines(), [])

  useEffect(() => {
    const on = () => {
      const el = wrap.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setP(Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))))
    }
    on()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
    }
  }, [])

  // Eased so the early beats (today, salary late, Ada adjusts) each get their moment.
  const day = Math.min(SPAN - 1, Math.round(Math.pow(p, 1.6) * (SPAN - 1)))
  const W = 1000, H = 300
  const min = Math.min(...nothing, ...acted, 0) * 1.1
  const max = 720_000
  const y = (v: number) => H - ((v - min) / (max - min)) * H
  const zeroY = y(0)
  const actedPath = linePath(acted, W, H, min, max)
  const nothingPath = linePath(nothing, W, H, min, max)
  const drawn = day / (SPAN - 1)
  const warned = day >= 4
  const zeroAt = nothing.findIndex((v) => v < 0)
  const balance = acted[day]

  const beat =
    day < 4
      ? { k: 'Today', t: `${naira(312_000)} in the bank.`, s: 'Salary is due on the 25th. Everything looks fine.' }
      : day < 11
        ? { k: 'Salary is late', t: 'It didn’t come.', s: `FinWise noticed the same day and ran the numbers: at this pace Ada hits ₦0 on ${cal[zeroAt]?.label ?? 'the 2nd'}.` }
        : day < 18
          ? { k: 'Ada adjusts', t: 'Pause one transfer. Spend ₦2,000 less a day.', s: 'Two small moves, suggested from her own spending. The red line is where she was heading.' }
          : { k: 'Salary lands', t: 'Fourteen days late. Never below zero.', s: 'That’s the point of seeing next month first.' }

  return (
    <section id="how" ref={wrap} className="relative h-[420vh] text-white">
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden">
        <BrandField />
        <div className="relative mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-5 pb-8 pt-24 sm:px-8 sm:pt-28">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="eyebrow text-white/60">How FinWise thinks</p>
              <p className="mt-3 text-[clamp(30px,5vw,60px)] font-semibold leading-none tracking-[-0.03em]">
                <span className="num">{cal[day].label}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="eyebrow text-white/60">Ada’s balance</p>
              <p className={`num mt-3 text-[clamp(22px,3.4vw,40px)] font-semibold leading-none ${balance < 60_000 ? 'text-[var(--blush-2)]' : ''}`}>{naira(balance)}</p>
            </div>
          </div>

          <div className="relative mt-6 min-h-0 flex-1">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              <defs>
                <linearGradient id="cal-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <clipPath id="cal-clip">
                  <rect x="0" y="-50" width={W * drawn} height={H + 100} />
                </clipPath>
              </defs>
              <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="#fff" strokeOpacity="0.25" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
              {/* where she was heading, once FinWise has seen it */}
              <path d={nothingPath} fill="none" stroke="#ff9a7a" strokeWidth="2" strokeDasharray="6 7" vectorEffect="non-scaling-stroke" style={{ opacity: warned ? 0.9 : 0, transition: 'opacity 0.8s' }} />
              <g clipPath="url(#cal-clip)">
                <path d={`${actedPath} L${W},${H} L0,${H} Z`} fill="url(#cal-fill)" />
                <path d={actedPath} fill="none" stroke="#fff" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
            {/* moving head */}
            <span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_6px_rgb(255_255_255/0.2),0_0_24px_rgb(255_255_255/0.8)]" style={{ left: `${drawn * 100}%`, top: `${(y(balance) / H) * 100}%` }} />
            <span className="absolute -translate-x-1/2 text-[11px] font-medium text-white/60" style={{ left: '0%', top: `calc(${(zeroY / H) * 100}% + 6px)` }}>₦0</span>
            {warned && zeroAt > 0 && (
              <span className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-[#ff9a7a] px-2.5 py-1 text-[11px] font-semibold text-[#3a0019] shadow-lg" style={{ left: `${(zeroAt / (SPAN - 1)) * 100}%`, top: `calc(${(zeroY / H) * 100}% - 10px)` }}>
                ₦0 by {cal[zeroAt].label}
              </span>
            )}
          </div>

          <div className="relative mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div key={beat.k} className="rise max-w-[640px]">
              <p className="eyebrow text-[var(--blush-2)]">{beat.k}</p>
              <p className="mt-2 text-[clamp(26px,3.6vw,46px)] font-semibold leading-[1.08] tracking-[-0.03em]">{beat.t}</p>
              <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-white/75 sm:text-[16px]">{beat.s}</p>
            </div>
            <div className={`glass-dark w-full max-w-[340px] rounded-[22px] p-4 transition-all duration-700 ${warned && day < 18 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
              <p className="flex items-center gap-2 text-[13px] font-semibold">
                <span className="h-2 w-2 rounded-full bg-[#ff9a7a]" /> FinWise · Heads up
              </p>
              <p className="mt-1 text-[14px] text-white/85">Your salary hasn’t landed. At this pace you could run short on {cal[zeroAt]?.label}. Tap to see what helps.</p>
            </div>
          </div>
          <div className="relative mt-6 h-[3px] overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-white" style={{ width: `${p * 100}%` }} />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── The simulator card ─────────────────────────── */

type Tab = { id: string; label: string; question: string; min: number; max: number; step: number; def: number; unit: 'naira' | 'days'; make: (v: number) => What }
const TABS: Tab[] = [
  { id: 'buy', label: 'Buy something', question: 'Can I afford a new laptop?', min: 20_000, max: 900_000, step: 10_000, def: 450_000, unit: 'naira', make: (v) => ({ kind: 'purchase', amount: v, inDays: 3 }) },
  { id: 'late', label: 'Salary comes late', question: 'What if my salary is late?', min: 0, max: 21, step: 1, def: 10, unit: 'days', make: (v) => ({ kind: 'late', days: v }) },
  { id: 'hire', label: 'Hire someone', question: 'Can I pay a new staff member?', min: 30_000, max: 400_000, step: 5_000, def: 150_000, unit: 'naira', make: (v) => ({ kind: 'hire', monthly: v }) },
]

export function Simulator() {
  const [tab, setTab] = useState(TABS[0])
  const [v, setV] = useState(TABS[0].def)
  const base = useMemo(() => project(null), [])
  const run = useMemo(() => project(tab.make(v)), [tab, v])
  const shown = Math.round(useSmooth(v, tab.id) / tab.step) * tab.step

  const W = 600, H = 170
  const min = Math.min(...base.series, ...run.series, 0)
  const max = Math.max(...base.series, ...run.series)
  const zeroY = H - ((0 - min) / (max - min)) * H
  const pct = ((v - tab.min) / (tab.max - tab.min)) * 100
  const verdict = VERDICT[run.verdict]

  return (
    <section id="simulator" className="relative px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="eyebrow text-[var(--brand)]">Decision Simulator</p>
          <h2 className="mt-4 text-[clamp(38px,5.4vw,68px)] font-semibold leading-[1.02] tracking-[-0.04em]">
            Ask before
            <br />
            you spend.
          </h2>
          <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-[var(--ink-2)]">
            Pick a decision and move the slider. FinWise replays your next 60 days with it, using your own last three months, and tells you straight.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t)
                  setV(t.def)
                }}
                className={`h-11 rounded-full px-5 text-[14px] font-medium transition-all duration-300 ${t.id === tab.id ? 'bg-[var(--ink)] text-white shadow-[0_10px_24px_-10px_rgb(0_0_0/0.5)]' : 'bg-white text-[var(--ink-2)] ring-1 ring-black/10 hover:ring-black/25'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[13px] text-[var(--muted)]">Sample numbers for Ada. In the app it runs on yours.</p>
        </div>

        {/* The card */}
        <div className="relative overflow-hidden rounded-[32px] p-6 text-white shadow-[0_40px_80px_-30px_rgb(79_0_34/0.65)] sm:p-9">
          <BrandField />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-white/85">{tab.question}</p>
              <span className="glass-dark inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ background: run.verdict === 'ok' ? '#5fe0a8' : run.verdict === 'tight' ? '#ffcf5c' : '#ff9a7a' }} />
                {verdict.label}
              </span>
            </div>
            <p className="num mt-5 text-[clamp(44px,6vw,72px)] font-semibold leading-none tracking-[-0.03em]">
              {tab.unit === 'naira' ? naira(shown) : `${Math.round(shown)} days`}
              {tab.id === 'hire' && <span className="text-[0.35em] font-medium text-white/70"> a month</span>}
              {tab.id === 'late' && <span className="text-[0.35em] font-medium text-white/70"> late</span>}
            </p>
            <input
              type="range"
              aria-label={tab.question}
              className="brand-range mt-6"
              min={tab.min}
              max={tab.max}
              step={tab.step}
              value={v}
              onChange={(e) => setV(Number(e.target.value))}
              style={{ ['--p' as string]: `${pct}%` }}
            />

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="glass-dark rounded-[20px] p-4">
                <p className="text-[12px] text-white/65">Lowest balance</p>
                <p className={`num mt-1 text-[22px] font-semibold ${run.lowest < 0 ? 'text-[#ffb59c]' : ''}`}>{naira(run.lowest)}</p>
                <p className="text-[12px] text-white/60">on {run.cal[run.lowAt].label}</p>
              </div>
              <div className="glass-dark rounded-[20px] p-4">
                <p className="text-[12px] text-white/65">In 60 days</p>
                <p className={`num mt-1 text-[22px] font-semibold ${run.end < 0 ? 'text-[#ffb59c]' : ''}`}>{naira(run.end)}</p>
                <p className="text-[12px] text-white/60">vs {nairaK(base.end)} without it</p>
              </div>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-6 h-[150px] w-full overflow-visible">
              <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="#fff" strokeOpacity="0.3" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
              <path d={linePath(base.series, W, H, min, max)} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={linePath(run.series, W, H, min, max)} fill="none" stroke="#fff" strokeWidth="3" vectorEffect="non-scaling-stroke" style={{ transition: 'd 0.35s cubic-bezier(0.22,1,0.36,1)' }} />
            </svg>
            <div className="mt-3 flex gap-5 text-[12px] text-white/70">
              <span className="flex items-center gap-2"><span className="h-[3px] w-5 rounded bg-white" /> With this decision</span>
              <span className="flex items-center gap-2"><span className="h-[2px] w-5 rounded bg-white/40" /> As things are</span>
            </div>
            <Link to="/try" className="pill-white mt-7 w-full justify-center sm:w-auto">
              Try it on Ada’s money <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Eases a number toward its target so big jumps roll instead of snapping. A new `key` snaps. */
function useSmooth(target: number, key: string) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  const lastKey = useRef(key)
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key
      cur.current = target
      setV(target)
      return
    }
    let f = 0
    const tick = () => {
      cur.current += (target - cur.current) * 0.2
      if (Math.abs(target - cur.current) < 1) cur.current = target
      setV(cur.current)
      if (cur.current !== target) f = requestAnimationFrame(tick)
    }
    f = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(f)
  }, [target, key])
  return v
}
