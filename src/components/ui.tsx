// Minimal UI building blocks. Rejoice's designs will restyle these in one place.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/** Layout for signed-out and onboarding screens: phone = single column; desktop = brand panel + form. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-brand-grad p-12 text-white lg:flex">
        <span className="text-3xl font-bold">FinWise</span>
        <div>
          <p className="text-4xl font-semibold leading-tight">Turn your financial data into smarter decisions.</p>
          <p className="mt-4 max-w-md text-lg text-white/80">Understand where your money goes, see what's coming, and act before it becomes a problem.</p>
        </div>
        <p className="text-sm text-white/70">Personal and business finance in one place.</p>
      </aside>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-8 lg:justify-center lg:py-12">{children}</main>
    </div>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const styles =
    variant === 'primary'
      ? 'bg-brand text-white hover:bg-brand-dark disabled:opacity-60'
      : 'bg-white text-[#1a1215] ring-1 ring-black/10 hover:bg-[#f4f2f3]'
  return (
    <button
      className={`w-full rounded-[12px] px-4 py-3 font-semibold transition ${styles} ${className}`}
      {...props}
    />
  )
}

export function TextField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#4a4246]">{label}</span>
      <input
        className="w-full rounded-[12px] border border-black/10 bg-white px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        {...props}
      />
    </label>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-lg bg-[#fde4e4] px-3 py-2 text-sm text-[#c03535]">
      {children}
    </p>
  )
}
