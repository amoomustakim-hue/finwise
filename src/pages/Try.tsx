// /try — "Try it yourself": one tap (or one QR scan) opens a private demo account with sample data.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { Screen } from '../components/ui'
import { api, type User } from '../lib/api'

export default function Try() {
  const { user, loading, setUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const started = useRef(false) // StrictMode runs effects twice in dev; create only one account

  useEffect(() => {
    if (loading || started.current) return
    started.current = true
    if (user) {
      navigate('/home', { replace: true }) // already signed in (real or demo account)
      return
    }
    api<{ user: User }>('/demo/start', { method: 'POST', body: {} })
      .then((r) => {
        setUser(r.user)
        navigate('/home', { replace: true })
      })
      .catch((e) => setError(e.message))
  }, [loading, user, navigate, setUser])

  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {!error ? (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <p className="text-lg font-semibold">Setting up your demo…</p>
            <p className="text-sm text-slate-600">
              You'll explore FinWise as Ada, who has a salary and runs Mama Nkechi Foods. Everything you see is sample data.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold">We couldn't start the demo</p>
            <p className="text-sm text-slate-600">{error}</p>
            <Link to="/" className="font-semibold text-brand">Back</Link>
          </>
        )}
      </div>
    </Screen>
  )
}
