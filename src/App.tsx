import { useEffect, useState } from 'react'

type Health = { ok: boolean; db: string; now?: string; postgres?: string }

// Temporary "hello" screen: proves front end → API → Neon works end to end.
function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>FinWise</h1>
      <p>The truth about your money.</p>
      {error && <p>API error: {error}</p>}
      {!health && !error && <p>Checking database…</p>}
      {health && (
        <p>
          Database: <strong>{health.db}</strong>
          {health.postgres && ` · Postgres ${health.postgres}`}
        </p>
      )}
    </main>
  )
}

export default App
