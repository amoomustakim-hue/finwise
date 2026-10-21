// Two-series balance line chart: "As things are" (muted) vs "With this decision" (accent).
// One y-axis, thin 2px lines, a zero line when the balance can go negative, legend + direct end
// labels, and a hover/tap crosshair with a tooltip showing both values for that day.
// Drawn at the container's real width so text stays readable on phones.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatNaira } from '../lib/format'

type Point = { date: string; baselineKobo: number; scenarioKobo: number }

const H = 240
const PAD = { top: 16, right: 60, bottom: 28, left: 56 }

const compact = (kobo: number) => {
  const n = kobo / 100
  const abs = Math.abs(n)
  const s = abs >= 1e6 ? `${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M` : abs >= 1e3 ? `${Math.round(abs / 1e3)}K` : `${Math.round(abs)}`
  return `${n < 0 ? '−' : ''}₦${s}`
}

export default function BalanceChart({ days }: { days: Point[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(640)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { x, y, ticks, base, scen, lo } = useMemo(() => {
    const values = days.flatMap((d) => [d.baselineKobo, d.scenarioKobo])
    const dataMin = Math.min(...values)
    const maxV = Math.max(...values, dataMin + 100)
    // Include ₦0 only when the balance gets near or below it; otherwise zoom in on the movement.
    const minV = dataMin < 0 || dataMin < maxV * 0.25 ? Math.min(0, dataMin) : dataMin
    // "Nice" round ticks (1, 2, 2.5, 5 × 10^n) so the axis reads ₦0, ₦100K, ₦200K…
    const raw = (maxV - minV) / 4
    const mag = 10 ** Math.floor(Math.log10(raw))
    const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? 10 * mag
    const lo = Math.floor(minV / step) * step
    const hi = Math.ceil(maxV / step) * step
    const x = (i: number) => PAD.left + (i / Math.max(days.length - 1, 1)) * (W - PAD.left - PAD.right)
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom)
    const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + step * i)
    const path = (key: 'baselineKobo' | 'scenarioKobo') => days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
    return { x, y, ticks, base: path('baselineKobo'), scen: path('scenarioKobo'), lo }
  }, [days, W])

  function onMove(clientX: number) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const i = Math.round(((clientX - rect.left - PAD.left) / (W - PAD.left - PAD.right)) * (days.length - 1))
    setHover(Math.max(0, Math.min(days.length - 1, i)))
  }

  // End labels: keep at least 13px apart, the higher value above.
  const last = days.length - 1
  const ys = { s: y(days[last].scenarioKobo), b: y(days[last].baselineKobo) }
  if (Math.abs(ys.s - ys.b) < 13) {
    const mid = (ys.s + ys.b) / 2
    const scenHigher = days[last].scenarioKobo >= days[last].baselineKobo
    ys.s = mid + (scenHigher ? -6.5 : 6.5)
    ys.b = mid + (scenHigher ? 6.5 : -6.5)
  }
  const fmtDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <figure className="relative">
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-slate-400" /> As things are</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-brand" /> With this decision</span>
      </div>
      {/* The wrapper takes its width from the page (never from the chart), and the chart is
          redrawn at that measured width so text stays at its real size. */}
      <div ref={wrapRef} className="relative w-full min-w-0 overflow-hidden">
        <svg
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block w-full touch-none select-none"
          role="img"
          aria-label="Projected balance over the next 60 days, as things are and with this decision"
          onMouseMove={(e) => onMove(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => onMove(e.touches[0].clientX)}
          onTouchMove={(e) => onMove(e.touches[0].clientX)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#64748b">{compact(t)}</text>
            </g>
          ))}
          {lo < 0 && <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="#d03b3b" strokeDasharray="4 4" strokeWidth={1} />}
          {[0, Math.floor(last / 2), last].map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontSize={11} fill="#64748b">{fmtDay(days[i].date)}</text>
          ))}
          <path d={base} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={scen} fill="none" stroke="var(--color-brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <text x={W - PAD.right + 6} y={ys.s + 4} fontSize={11} fill="#0f172a" fontWeight={600}>{compact(days[last].scenarioKobo)}</text>
          <text x={W - PAD.right + 6} y={ys.b + 4} fontSize={11} fill="#64748b">{compact(days[last].baselineKobo)}</text>
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="#94a3b8" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(days[hover].baselineKobo)} r={4} fill="#94a3b8" stroke="#fff" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(days[hover].scenarioKobo)} r={4} fill="var(--color-brand)" stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200"
            style={{ left: Math.max(0, Math.min(x(hover) - 75, W - 160)) }}
          >
            <p className="font-semibold">{fmtDay(days[hover].date)}</p>
            <p className="text-slate-600">As things are: <span className="font-medium text-slate-900">{formatNaira(days[hover].baselineKobo)}</span></p>
            <p className="text-slate-600">With decision: <span className="font-medium text-slate-900">{formatNaira(days[hover].scenarioKobo)}</span></p>
          </div>
        )}
      </div>
      <figcaption className="sr-only">
        Lowest projected balance with this decision: {formatNaira(Math.min(...days.map((d) => d.scenarioKobo)))}.
      </figcaption>
    </figure>
  )
}
