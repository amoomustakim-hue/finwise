// Shared pieces for the landing page: reveals, counters, the word-by-word paragraph and the arrow.
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Adds `.in` when the element scrolls into view. */
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'p' | 'h2' | 'li' }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (el.classList.add('in'), io.disconnect()), { threshold: 0.18 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    // @ts-expect-error polymorphic ref
    <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  )
}

/** True once the element has been seen. */
export function useSeen<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen] as const
}

/** Counts up to `to` the first time it is seen. */
export function Count({ to, format = (n) => Math.round(n).toLocaleString('en-NG'), duration = 1400 }: { to: number; format?: (n: number) => string; duration?: number }) {
  const [ref, seen] = useSeen<HTMLSpanElement>(0.5)
  const [v, setV] = useState<number | null>(null)
  useEffect(() => {
    if (!seen) return
    let f = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration)
      setV(to * (1 - Math.pow(1 - k, 3)))
      if (k < 1) f = requestAnimationFrame(tick)
    }
    f = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(f)
  }, [seen, to, duration])
  return <span ref={ref} className="num">{format(v ?? 0)}</span>
}

/** A paragraph whose words light up one by one as it crosses the screen. */
export function Words({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ws = [...el.querySelectorAll<HTMLSpanElement>('.w')]
    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)))
      const n = Math.round(p * ws.length)
      ws.forEach((w, i) => w.classList.toggle('on', i < n))
    }
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])
  return (
    <p ref={ref} className={`words ${className}`}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="w">
          {w}&nbsp;
        </span>
      ))}
    </p>
  )
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
