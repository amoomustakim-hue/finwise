import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { AuthError, AuthShell, AuthTitle, DemoLink, Field, Submit } from '../landing/AuthShell'
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
    <AuthShell>
      <AuthTitle title="Welcome back" sub="Sign in to see where your money is heading." />
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Email" icon="mail" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <Field label="Password" icon="lock" name="password" type="password" autoComplete="current-password" placeholder="Your password" required />
        <AuthError>{error}</AuthError>
        <Submit type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Submit>
      </form>
      <DemoLink />
      <p className="mt-8 text-center text-[14px] text-[var(--muted)]">
        New to FinWise?{' '}
        <Link to="/signup" className="font-semibold text-[var(--brand)]">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
