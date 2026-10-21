import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { Button, ErrorText, Screen, TextField } from '../components/ui'
import { api, type User } from '../lib/api'

export default function SignUp() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      const { user } = await api<{ user: User }>('/auth/signup', {
        method: 'POST',
        body: { name: form.get('name'), email: form.get('email'), password: form.get('password') },
      })
      setUser(user)
      navigate('/onboarding')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="Full name" name="name" autoComplete="name" required />
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <TextField label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <Link to="/signin" className="font-semibold text-brand">Sign in</Link>
      </p>
    </Screen>
  )
}
