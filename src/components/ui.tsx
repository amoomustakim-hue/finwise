// Small shared pieces outside the main screens: the full-screen status page and error text.
import type { ReactNode } from 'react'

/** Full-screen brand page for short waits (bank connecting, demo starting) and their outcome. */
export function StatusScreen({ busy, title, body, children }: { busy: boolean; title: string; body?: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-brand-grad px-6 text-center text-white">
      <span aria-hidden="true" className="absolute -left-24 -top-24 h-72 w-72 rounded-full border-[10px] border-white/[0.06]" />
      <span aria-hidden="true" className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full border-[10px] border-white/[0.06]" />
      <div className="relative grid h-20 w-20 place-items-center">
        {busy && <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />}
        <img src="/icon.svg" alt="" className="h-12 w-12 rounded-[12px] ring-1 ring-white/40" />
      </div>
      <p className="relative mt-6 max-w-[360px] text-[20px] font-semibold leading-snug" aria-live="polite">
        {title}
      </p>
      {body && <p className="relative mt-2 max-w-[360px] text-[14px] text-white/80">{body}</p>}
      {children && <div className="relative mt-6">{children}</div>}
    </div>
  )
}

export const statusLink = 'inline-flex items-center gap-1 rounded-[12px] bg-white px-5 py-3 text-[14px] font-semibold text-brand'

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-[12px] bg-[#fde4e4] px-3 py-2.5 text-[13px] text-[#c03535]">
      {children}
    </p>
  )
}
