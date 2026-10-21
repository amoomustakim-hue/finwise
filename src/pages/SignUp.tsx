import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { AuthError, AuthShell, AuthTitle, DemoLink, Field, Submit } from '../landing/AuthShell'
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
    <AuthShell>
      <AuthTitle title="Create your account" sub="It takes a minute. Your bank stays read-only." />
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Full name" icon="user" name="name" autoComplete="name" placeholder="Ada Okafor" required />
        <Field label="Email" icon="mail" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <Field label="Password" icon="lock" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
        <AuthError>{error}</AuthError>
        <Submit type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </Submit>
      </form>
      <DemoLink />
      <p className="mt-8 text-center text-[14px] text-[var(--muted)]">
        Already have an account?{' '}
        <Link to="/signin" className="font-semibold text-[var(--brand)]">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
