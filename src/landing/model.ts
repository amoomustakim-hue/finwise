// Money formatting and the small cash model behind the landing page demos.

export const naira = (n: number) => `${n < 0 ? '−' : ''}₦${Math.abs(Math.round(n)).toLocaleString('en-NG')}`
export const nairaK = (n: number) => {
  const a = Math.abs(n)
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${Math.round(a / 1e3)}K` : `${Math.round(a)}`
  return `${n < 0 ? '−' : ''}₦${s}`
}

/** Days from today, in Lagos time. */
export function days(n: number) {
  const now = new Date(Date.now() + 3600_000)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i))
    return { dom: d.getUTCDate(), dow: d.getUTCDay(), label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) }
  })
}

export type What = { kind: 'purchase'; amount: number; inDays: number } | { kind: 'late'; days: number } | { kind: 'hire'; monthly: number }

/**
 * Ada's next 60 days, as things are and with a decision applied. Sample numbers that behave
 * like the real Decision Simulator: a start balance, regular money on its usual day, and an
 * average daily spend (a little more at weekends).
 */
export function project(what: What | null, horizon = 60) {
  const cal = days(horizon)
  const start = 312_000
  const out: number[] = []
  let bal = start
  const salaryDay = 25
  for (let i = 0; i < horizon; i++) {
    const d = cal[i]
    bal -= d.dow === 6 || d.dow === 0 ? 9_200 : 6_400
    let salaryToday = d.dom === salaryDay
    if (what?.kind === 'late') {
      // The salary lands `days` later than the 25th.
      const shifted = cal[i - what.days]
      salaryToday = !!shifted && shifted.dom === salaryDay
    }
    if (salaryToday) bal += 380_000
    if (d.dom === 2) bal -= 18_000 // bills
    if (d.dom === 28) bal -= 40_000 // family support
    if (what?.kind === 'purchase' && i === what.inDays) bal -= what.amount
    if (what?.kind === 'hire' && d.dom === 27) bal -= what.monthly
    out.push(bal)
  }
  const lowest = Math.min(...out)
  const lowAt = out.indexOf(lowest)
  const verdict: 'ok' | 'tight' | 'short' = lowest < 0 ? 'short' : lowest < 45_000 ? 'tight' : 'ok'
  return { series: out, lowest, lowAt, end: out[out.length - 1], verdict, cal }
}

export const VERDICT = {
  ok: { label: 'Looks manageable', dot: '#0f766e' },
  tight: { label: 'Possible, but tight', dot: '#c98a00' },
  short: { label: 'You could run short', dot: '#e2553f' },
} as const

/** Line path through a series, scaled into a box. */
export function linePath(values: number[], w: number, h: number, min: number, max: number) {
  const span = max - min || 1
  return values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`).join(' ')
}

