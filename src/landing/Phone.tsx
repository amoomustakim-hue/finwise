// A flagship phone drawn in CSS (titanium frame, island, status bar) and the FinWise screens
// that run inside it. Sized by the --pw custom property on the wrapper.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { linePath, project } from './model'

export function Phone({ children, className = '', style, dark = false, darkStatus = false }: { children: ReactNode; className?: string; style?: CSSProperties; dark?: boolean; darkStatus?: boolean }) {
  const frame = 'linear-gradient(145deg, #e9ebe8 0%, #8e9591 16%, #dfe2df 32%, #6f7672 52%, #c9cdca 72%, #5c625f 100%)'
  const btn = (s: CSSProperties) => <span aria-hidden="true" className="absolute w-[4px] rounded-[2px]" style={{ background: frame, ...s }} />
  return (
    <div className={`relative aspect-[9/19.5] w-[var(--pw)] ${className}`} style={style}>
      {btn({ left: -3, top: '17%', height: '4%' })}
      {btn({ left: -3, top: '24%', height: '7.5%' })}
      {btn({ left: -3, top: '33%', height: '7.5%' })}
      {btn({ right: -3, top: '27%', height: '11%' })}
      <div className="absolute inset-0 rounded-[calc(var(--pw)*0.165)] p-[3px] shadow-[0_70px_120px_-40px_rgb(79_0_34/0.55),0_30px_60px_-30px_rgb(40_0_17/0.45)]" style={{ background: frame }}>
        <div className="h-full w-full rounded-[calc(var(--pw)*0.165-3px)] bg-[#070908] p-[calc(var(--pw)*0.026)]">
          <div className={`relative h-full w-full overflow-hidden rounded-[calc(var(--pw)*0.14)] [transform:translateZ(0)] ${dark ? 'bg-[#3a0019]' : 'bg-[#f7f4f5]'}`}>
            <span aria-hidden="true" className="absolute left-1/2 top-[2.4%] z-40 h-[3.6%] w-[31%] -translate-x-1/2 rounded-full bg-black" />
            <StatusBar dark={darkStatus} />
            {children}
            <span aria-hidden="true" className={`pointer-events-none absolute bottom-[1%] left-1/2 z-40 h-[0.6%] w-[34%] -translate-x-1/2 rounded-full ${dark ? 'bg-white/80' : 'bg-black/80'}`} />
          </div>
        </div>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-[3px] rounded-[calc(var(--pw)*0.16)] bg-[linear-gradient(115deg,rgb(255_255_255/0.22)_0%,rgb(255_255_255/0)_30%,rgb(255_255_255/0)_72%,rgb(255_255_255/0.08)_100%)]" />
    </div>
  )
}

/** White over the magenta tops, black over white screens. */
function StatusBar({ dark }: { dark: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[7%] items-center justify-between px-[8%] pt-[1%] text-[calc(var(--pw)*0.042)] font-semibold transition-colors duration-500 ${dark ? 'text-[#1a1215]' : 'text-white'}`}>
      <span className="num">9:41</span>
      <span className="flex items-center gap-[4px]">
        <svg width="16" height="10" viewBox="0 0 17 11" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.5} y={8 - i * 2.6} width="3" height={3 + i * 2.6} rx="1" fill="currentColor" />
          ))}
        </svg>
        <span className="relative h-[10px] w-[22px] rounded-[3px] border border-current/50 p-[1.5px]">
          <span className="block h-full w-[70%] rounded-[1.5px] bg-current" />
        </span>
      </span>
    </div>
  )
}

/** The FinWise home screen, in the app's own look: magenta header, balance, then white cards. */
export function HomeScreen({ mode = 'personal', insight = false }: { mode?: 'personal' | 'business'; insight?: boolean }) {
  const { series } = project(null, 30)
  const min = Math.min(...series)
  const max = Math.max(...series)
  const d = linePath(series, 100, 34, min, max)
  const biz = mode === 'business'
  const [mounted, setMounted] = useState(false)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const f = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(f)
  }, [])
  const fs = (k: number) => ({ fontSize: `calc(var(--pw) * ${k})` })

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f7f4f5]" style={fs(0.04)}>
      {/* Header */}
      <div className="relative px-[6%] pb-[9%] pt-[17%] text-white" style={{ background: 'linear-gradient(115deg, #4f0022 0%, #710131 32%, #980042 72%, #980142 100%)' }}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-[3%]">
            <span className="icon-glass h-[calc(var(--pw)*0.105)] w-[calc(var(--pw)*0.105)]">
              <svg viewBox="0 0 24 24" className="h-[52%] w-[52%]" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" /></svg>
            </span>
            <span className="whitespace-nowrap font-medium" style={fs(0.045)}>Hi, {biz ? 'Mama Nkechi' : 'Ada'}</span>
          </span>
          <span className="icon-glass relative h-[calc(var(--pw)*0.105)] w-[calc(var(--pw)*0.105)]">
            <svg viewBox="0 0 24 24" className="h-[52%] w-[52%]" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" strokeLinejoin="round" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
            <span className="absolute right-[22%] top-[20%] h-[16%] w-[16%] rounded-full bg-white" />
          </span>
        </div>
        <p className="mt-[9%] text-center text-white/85" style={fs(0.037)}>{biz ? 'Business balance' : 'Total Balance'}</p>
        <p className="num mt-[1%] flex items-center justify-center gap-[3%] font-normal leading-none" style={fs(0.1)}>
          {hidden ? '₦ • • • • • •' : biz ? '₦1,284,500.00' : '₦845,500.00'}
          <button type="button" onClick={() => setHidden((h) => !h)} aria-label="Show or hide balance" className="text-white/90">
            <svg viewBox="0 0 24 24" style={{ width: 'calc(var(--pw)*0.055)' }} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
        </p>
        {!insight && (
          <div className="mx-auto mt-[6%] flex w-fit rounded-full bg-white/10 p-[3px] ring-1 ring-white/15" style={fs(0.03)}>
            <span className={`rounded-full px-[10px] py-[4px] font-medium ${!biz ? 'bg-white text-[#980042]' : 'text-white/75'}`}>Personal</span>
            <span className={`rounded-full px-[10px] py-[4px] font-medium ${biz ? 'bg-white text-[#980042]' : 'text-white/75'}`}>Business</span>
          </div>
        )}
      </div>

      <div className="relative -mt-[5%] px-[5%]">
        {insight && (
          /* The app's insight card, as Rejoice designed it */
          <div className="mb-[4%] rounded-[calc(var(--pw)*0.06)] bg-white p-[5.5%] shadow-[0_10px_24px_-14px_rgb(79_0_34/0.35)]">
            <div className="flex items-center gap-[4%]">
              <svg viewBox="0 0 24 24" className="shrink-0 text-[#980042]" style={{ width: 'calc(var(--pw)*0.075)' }} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 3c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" />
                <path d="M18 13.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5zM18.5 2.5c.2 1 .6 1.4 1.5 1.5-.9.2-1.3.6-1.5 1.5-.2-.9-.6-1.3-1.5-1.5.9-.1 1.3-.5 1.5-1.5z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight text-[#1a1215]" style={fs(0.046)}>Your AI insight</p>
                <p className="text-[#6b6266]" style={fs(0.03)}>Personalised financial update</p>
              </div>
              <svg viewBox="0 0 24 24" className="shrink-0 text-[#4a4246]" style={{ width: 'calc(var(--pw)*0.05)' }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </div>
            <p className="mt-[4%] leading-snug text-[#1a1215]" style={fs(0.036)}>
              Your spending is 12% higher than last month, mainly due to food and transportation.
            </p>
          </div>
        )}
        {/* The month, projected */}
        <div className="rounded-[calc(var(--pw)*0.06)] bg-white p-[5.5%] shadow-[0_10px_24px_-14px_rgb(79_0_34/0.35)]">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-[#1a1215]" style={fs(0.038)}>{biz ? 'Sales this month' : 'Next 30 days'}</p>
            <p className="font-medium text-[#980042]" style={fs(0.03)}>{biz ? '▲ 12%' : 'Ends ₦96,000'}</p>
          </div>
          <svg viewBox="0 0 100 40" className="mt-[4%] w-full overflow-visible" preserveAspectRatio="none" style={{ height: 'calc(var(--pw) * 0.15)' }}>
            <defs>
              <linearGradient id="hs-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#980042" stopOpacity="0.22" />
                <stop offset="1" stopColor="#980042" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${d} L100,40 L0,40 Z`} fill="url(#hs-fill)" />
            <path d={d} fill="none" stroke="#980042" strokeWidth="1.8" vectorEffect="non-scaling-stroke" pathLength={1} className={mounted ? 'draw' : ''} style={{ strokeDasharray: 1, strokeDashoffset: mounted ? undefined : 1 }} />
          </svg>
        </div>

        {/* Budgets */}
        <div className="mt-[4%] rounded-[calc(var(--pw)*0.06)] bg-white p-[5.5%] shadow-[0_10px_24px_-14px_rgb(79_0_34/0.25)]">
          <p className="font-semibold text-[#1a1215]" style={fs(0.038)}>Budgets</p>
          {(biz
            ? [['Inventory & supplies', 0.64, '#1f9d6b', 'On track'], ['Transportation', 0.88, '#f2a516', 'Nearly used'], ['Marketing', 0.3, '#1f9d6b', 'On track']]
            : [['Food', 0.82, '#f2a516', 'Likely to go over'], ['Transportation', 0.45, '#1f9d6b', 'On track'], ['Airtime & Data', 1, '#ff6a3d', 'Over budget']]
          ).map(([name, v, c, label], i) => (
            <div key={name as string} className="mt-[5%]">
              <div className="flex justify-between" style={fs(0.03)}>
                <span className="font-medium text-[#1a1215]">{name as string}</span>
                <span style={{ color: c as string }} className="font-medium">{label as string}</span>
              </div>
              <div className="mt-[4px] h-[5px] overflow-hidden rounded-full bg-[#f3e9ed]">
                <div className="h-full rounded-full transition-[width] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: mounted ? `${(v as number) * 100}%` : '0%', background: c as string, transitionDelay: `${400 + i * 120}ms` }} />
              </div>
            </div>
          ))}
        </div>

        {/* One insight */}
        <div className="mt-[4%] rounded-[calc(var(--pw)*0.06)] bg-[#ffe4ee] p-[5.5%]">
          <p className="font-semibold text-[#710131]" style={fs(0.035)}>{biz ? 'Saturdays bring your best sales' : 'Food is heading over budget'}</p>
          <p className="mt-[2%] text-[#710131]/75" style={fs(0.029)}>{biz ? 'Restock on Friday so you don’t run out.' : 'Spend ₦1,500 less a day to stay on track.'}</p>
        </div>
      </div>

      <div className="absolute inset-x-[5%] bottom-[3.5%] flex justify-around rounded-full bg-white py-[3.5%] shadow-[0_8px_24px_-10px_rgb(79_0_34/0.35)]" style={fs(0.026)}>
        {['Home', 'Activity', 'Simulator', 'Budgets'].map((t, i) => (
          <span key={t} className={`flex flex-col items-center gap-[2px] font-medium ${i === 0 ? 'text-[#980042]' : 'text-[#b3a8ac]'}`}>
            <span className={`block h-[6px] w-[6px] rounded-full ${i === 0 ? 'bg-[#980042]' : 'bg-[#e6dde0]'}`} />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

/** A lock screen with FinWise notifications stacking in. */
export function LockScreen({ items, answered, onAnswer }: { items: { title: string; body: string; time: string; ask?: boolean }[]; answered: boolean; onAnswer: () => void }) {
  const fs = (k: number) => ({ fontSize: `calc(var(--pw) * ${k})` })
  return (
    <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_30%_0%,#b0105a,#710131_45%,#3a0019_100%)] px-[5%] pt-[17%] text-white">
      <p className="text-center text-white/70" style={fs(0.036)}>Tuesday, 21 October</p>
      <p className="num text-center font-semibold leading-none" style={fs(0.2)}>9:41</p>
      <div className="mt-[10%] flex flex-col gap-[3%]">
        {items.map((n, i) => (
          <div key={n.title} className="rise rounded-[calc(var(--pw)*0.055)] bg-white/[0.14] p-[4.5%] backdrop-blur-xl" style={{ animationDelay: `${300 + i * 450}ms` }}>
            <div className="flex items-center justify-between" style={fs(0.028)}>
              <span className="flex items-center gap-[6px] font-semibold uppercase tracking-wide text-white/80">
                <Mark className="h-[14px] w-[14px]" />
                FinWise
              </span>
              <span className="text-white/55">{n.time}</span>
            </div>
            <p className="mt-[2%] font-bold" style={fs(0.037)}>{n.title}</p>
            <p className="text-white/80" style={fs(0.033)}>{n.body}</p>
            {n.ask && (
              <div className="mt-[4%] flex gap-[3%]" style={fs(0.032)}>
                {answered ? (
                  <span className="flex-1 rounded-full bg-white py-[3%] text-center font-semibold text-[#980042]">✓ Sorted as Food</span>
                ) : (
                  <>
                    <button type="button" onClick={onAnswer} className="flex-1 rounded-full bg-white py-[3%] font-semibold text-[#980042]">Yes, Food</button>
                    <button type="button" onClick={onAnswer} className="flex-1 rounded-full bg-white/20 py-[3%] font-semibold">Change</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** The FinWise mark for the landing page: a magenta tile with a white F. */
export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="fw-mark" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#4f0022" />
          <stop offset="0.55" stopColor="#8d003d" />
          <stop offset="1" stopColor="#980142" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#fw-mark)" />
      <path d="M168 128h196v52H226v56h118v50H226v98h-58z" fill="#fff" />
      <circle cx="356" cy="370" r="26" fill="#ffc9dc" />
    </svg>
  )
}

