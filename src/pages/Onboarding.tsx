// "What will you use FinWise for?" — Personal, Business or both (+ business name).
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { Button, ErrorText, Screen, TextField } from '../components/ui'
import { api, type User } from '../lib/api'

type Choice = 'personal' | 'business' | 'both'

const OPTIONS: { value: Choice; title: string; hint: string }[] = [
  { value: 'personal', title: 'Personal', hint: 'Salary, spending, bills and savings' },
  { value: 'business', title: 'Business', hint: 'Sales, costs, profit and cash flow' },
  { value: 'both', title: 'Both', hint: 'I run a business and manage my own money too' },
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
    <Screen>
      <h1 className="text-2xl font-bold">Hi {user?.name.split(' ')[0]}, what will you use FinWise for?</h1>
      <p className="mb-6 mt-2 text-slate-600">You can change this later.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setChoice(o.value)}
            aria-pressed={choice === o.value}
            className={`rounded-xl bg-white p-4 text-left ring-1 transition ${
              choice === o.value ? 'ring-2 ring-brand' : 'ring-slate-300'
            }`}
          >
            <span className="block font-semibold">{o.title}</span>
            <span className="block text-sm text-slate-600">{o.hint}</span>
          </button>
        ))}
        {needsBusiness && (
          <TextField
            label="Business name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Mama Nkechi Foods"
            required
          />
        )}
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy || !choice} className="mt-2">
          {busy ? 'Saving…' : 'Continue'}
        </Button>
      </form>
    </Screen>
  )
}
