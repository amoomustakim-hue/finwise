// /try — "Try it yourself": one tap (or one QR scan) opens a private demo account with sample data.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { StatusScreen, statusLink } from '../components/ui'
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
    !error ? (
      <StatusScreen
        busy
        title="Setting up your demo…"
        body="You'll explore FinWise as Ada, who has a salary and runs Mama Nkechi Foods. Everything you see is sample data."
      />
    ) : (
      <StatusScreen busy={false} title="We couldn't start the demo" body={error}>
        <Link to="/" className={statusLink}>
          Back
        </Link>
      </StatusScreen>
    )
  )
}
