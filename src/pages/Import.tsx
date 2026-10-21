// Add data: upload a real statement (PDF/CSV) or load clearly labelled sample data.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth'
import AppShell from '../components/AppShell'
import { Button, ErrorText } from '../components/ui'
import { api, type Mode } from '../lib/api'
import { formatDate } from '../lib/format'
import { useMode } from '../mode'

const BANKS = ['Zenith Bank', 'GTBank', 'Access Bank', 'First Bank', 'UBA', 'OPay', 'Kuda', 'Moniepoint', 'PalmPay', 'Other']

type MonoStatus = { enabled: boolean; testMode: boolean; publicKey: string | null; accounts: unknown[] }

type ImportResult = {
  found: number
  imported: number
  duplicates: number
  notRead: number
  from: string
  to: string
  balanceCheck: { checked: number; matched: number }
}

export default function Import() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const both = !!user?.uses_personal && !!user?.uses_business
  const { mode: currentMode } = useMode()
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode | null) ?? currentMode)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'import' | 'demo' | 'mono' | null>(null)
  const [mono, setMono] = useState<MonoStatus | null>(null)

  useEffect(() => {
    api<MonoStatus>('/mono/sync').then(setMono).catch(() => setMono(null))
  }, [])

  /** Open Mono's Connect widget in-page; on success, our server exchanges the code for the account. */
  async function connectMono() {
    if (!mono?.publicKey || !user) return
    setBusy('mono')
    setError('')
    try {
      const { default: MonoConnect } = await import('@mono.co/connect.js') // loaded only when needed
      const widget = new MonoConnect({
        key: mono.publicKey,
        scope: 'auth',
        data: { customer: { name: user.name, email: user.email } },
        onSuccess: async ({ code }: { code: string }) => {
          try {
            await api('/mono/exchange', { method: 'POST', body: { code, mode } })
            navigate('/mono/return') // waits for Mono to finish fetching the bank's transactions
          } catch (err) {
            setError((err as Error).message)
            setBusy(null)
          }
        },
        onClose: () => setBusy((b) => (b === 'mono' ? null : b)),
      })
      widget.setup()
      widget.open()
    } catch (err) {
      setError((err as Error).message || 'Could not open Mono')
      setBusy(null)
    }
  }

  async function onImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    form.set('mode', mode)
    setBusy('import')
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/imports', { method: 'POST', body: form, credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setResult(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function loadDemo() {
    setBusy('demo')
    setError('')
    try {
      await api('/demo', { method: 'POST', body: {} })
      navigate('/home')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <AppShell title="Add your transactions">
      <p className="mb-6 max-w-3xl text-slate-600">
        Connect your bank, or download a statement from your bank app (PDF or CSV) and upload it here.
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-2">
      <div>
      {mono?.enabled && (
        <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Connect your bank</p>
            {mono.testMode && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">Test mode</span>}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Link your account securely through Mono. FinWise can only read your transactions. It can't move money.
          </p>
          <Button className="mt-3" onClick={connectMono} disabled={busy !== null}>
            {busy === 'mono' ? 'Opening Mono…' : 'Connect with Mono'}
          </Button>
          {mono.accounts.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">{mono.accounts.length} account(s) linked. They refresh each time you open FinWise.</p>
          )}
        </div>
      )}

      <p className="mb-2 text-sm font-semibold text-slate-700">{mono?.enabled ? 'Or import a statement' : 'Import a statement'}</p>
      <form onSubmit={onImport} className="flex flex-col gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        {both && (
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {(['personal', 'business'] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-sm font-semibold capitalize ${mode === m ? 'bg-white shadow' : 'text-slate-600'}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Bank</span>
          <select name="bankName" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
            <option value="" disabled>Choose your bank</option>
            {BANKS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Statement file</span>
          <input name="file" type="file" accept=".pdf,.csv,application/pdf,text/csv" required className="w-full text-sm" />
        </label>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy !== null}>{busy === 'import' ? 'Reading statement…' : 'Import statement'}</Button>
      </form>
      </div>

      <div className="flex flex-col gap-4">
      {result && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <p className="font-semibold">
            Imported {result.imported} transactions · {formatDate(result.from)} – {formatDate(result.to)}
          </p>
          {result.duplicates > 0 && <p>{result.duplicates} were already in FinWise and were skipped.</p>}
          {result.notRead > 0 && <p>{result.notRead} lines couldn't be read.</p>}
          {result.balanceCheck.checked > 0 && (
            <p>Balance check: {result.balanceCheck.matched} of {result.balanceCheck.checked} running balances match.</p>
          )}
          <Link to="/home" className="mt-2 inline-block font-semibold underline">See transactions</Link>
        </div>
      )}

      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="font-semibold text-amber-900">No statement handy?</p>
        <p className="mt-1 text-sm text-amber-800">
          Load realistic sample data to explore FinWise. It's clearly marked as sample data and can be removed anytime.
        </p>
        <Button variant="secondary" className="mt-3" onClick={loadDemo} disabled={busy !== null}>
          {busy === 'demo' ? 'Loading…' : 'Load sample data'}
        </Button>
      </div>
      </div>
      </div>
    </AppShell>
  )
}
