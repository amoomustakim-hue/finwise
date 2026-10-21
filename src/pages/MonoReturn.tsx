// Mono sends the user back here after linking. Mono notifies our server by webhook; we poll
// a sync until the bank's data is ready (Mono may take a little while to fetch it).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { StatusScreen, statusLink } from '../components/ui'
import { api } from '../lib/api'

type SyncResult = { results: { imported?: number; status?: string; error?: string }[]; accounts: unknown[] }

const POLL_MS = 4000
const GIVE_UP_MS = 90_000

export default function MonoReturn() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Finishing your bank connection…')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const started = Date.now()
    let timer: ReturnType<typeof setTimeout>
    let cancelled = false

    async function tick() {
      try {
        const r = await api<SyncResult>('/mono/sync', { method: 'POST', body: {} })
        const imported = r.results.reduce((n, x) => n + (x.imported ?? 0), 0)
        const ready = r.results.some((x) => x.status === 'AVAILABLE' || x.status === 'PARTIAL')
        if (imported > 0 || ready) {
          setMessage(imported > 0 ? `Connected. Imported ${imported} transactions.` : 'Connected. Your transactions are up to date.')
          setDone(true)
          setTimeout(() => !cancelled && navigate('/home'), 1500)
          return
        }
        setMessage(r.accounts.length ? 'Connected. Waiting for your bank to share transactions…' : 'Waiting for confirmation from Mono…')
      } catch {
        setMessage('Still connecting…')
      }
      if (Date.now() - started > GIVE_UP_MS) {
        setMessage("Your bank is taking a while. We'll import your transactions automatically the next time you open FinWise.")
        setDone(true)
        return
      }
      timer = setTimeout(tick, POLL_MS)
    }
    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [navigate])

  return (
    <StatusScreen busy={!done} title={message} body={!done ? 'This can take up to a minute while your bank shares your transactions.' : undefined}>
      {done && (
        <Link to="/home" className={statusLink}>
          Go to Overview
        </Link>
      )}
    </StatusScreen>
  )
}
