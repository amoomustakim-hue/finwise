import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { Button, ErrorText, Screen, TextField } from '../components/ui'
import { api, type User } from '../lib/api'

export default function SignIn() {
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
      const { user } = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password') },
      })
      setUser(user)
      navigate(user.onboarded ? '/home' : '/onboarding')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <h1 className="mb-6 text-2xl font-bold">Welcome back</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to FinWise? <Link to="/signup" className="font-semibold text-brand">Create an account</Link>
      </p>
    </Screen>
  )
}
