// "What will you use FinWise for?" — Personal, Business or both (+ business name).
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { AuthError, AuthShell, AuthTitle, Field, FieldIcon, Submit } from '../landing/AuthShell'
import { api, type User } from '../lib/api'

type Choice = 'personal' | 'business' | 'both'

const OPTIONS: { value: Choice; title: string; hint: string; icons: ('user' | 'store')[] }[] = [
  { value: 'personal', title: 'Personal', hint: 'Salary, spending, bills and savings', icons: ['user'] },
  { value: 'business', title: 'Business', hint: 'Sales, costs, profit and cash flow', icons: ['store'] },
  { value: 'both', title: 'Both', hint: 'I run a business and manage my own money too', icons: ['user', 'store'] },
]

export default function Onboarding() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [choice, setChoice] = useState<Choice | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const needsBusiness = choice === 'business' || choice === 'both'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!choice) return setError('Choose an option to continue')
    setBusy(true)
    setError('')
    try {
      const res = await api<{ user: User }>('/me', {
        method: 'PATCH',
        body: {
          usesPersonal: choice !== 'business',
          usesBusiness: needsBusiness,
          businessName: needsBusiness ? businessName : undefined,
        },
      })
      setUser(res.user)
      navigate('/home')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 flex items-center gap-2" aria-hidden="true">
        <span className="h-1.5 w-8 rounded-full bg-[var(--brand)]" />
        <span className="h-1.5 w-8 rounded-full bg-[var(--brand)]" />
        <span className="h-1.5 w-8 rounded-full bg-[#eadde3]" />
      </div>
      <AuthTitle title={<>Hi {user?.name.split(' ')[0]}, what will you use FinWise for?</>} sub="Pick one. You can change this later." />
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {OPTIONS.map((o) => {
          const on = choice === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setChoice(o.value)}
              aria-pressed={on}
              className={`flex items-center gap-4 rounded-[18px] border p-4 text-left transition ${
                on ? 'border-[var(--brand)] bg-[#fff5f9] shadow-[0_0_0_4px_rgb(152_0_66/0.08)]' : 'border-black/10 bg-white hover:border-black/20'
              }`}
            >
              <span className={`flex shrink-0 -space-x-2 ${on ? 'text-white' : 'text-[var(--brand)]'}`}>
                {o.icons.map((ic) => (
                  <span key={ic} className={`grid h-11 w-11 place-items-center rounded-full ring-2 ring-white transition ${on ? 'bg-[var(--brand)]' : 'bg-[#f6eef2]'}`}>
                    <FieldIcon name={ic} />
                  </span>
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{o.title}</span>
                <span className="block text-[13px] text-[var(--muted)]">{o.hint}</span>
              </span>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${on ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-black/15'}`}>
                {on && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5 10 17l9-10" />
                  </svg>
                )}
              </span>
            </button>
          )
        })}
        {needsBusiness && (
          <div className="rise mt-2">
            <Field label="Business name" icon="store" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Mama Nkechi Foods" required />
          </div>
        )}
        <AuthError>{error}</AuthError>
        <Submit type="submit" disabled={busy || !choice} className="mt-4">
          {busy ? 'Saving…' : 'Continue'}
        </Submit>
      </form>
    </AuthShell>
  )
}
