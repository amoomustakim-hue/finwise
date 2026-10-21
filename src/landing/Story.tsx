// The brand backdrop and the live Decision Simulator card.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Arrow } from './kit'
import { linePath, naira, nairaK, project, VERDICT, type What } from './model'

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
