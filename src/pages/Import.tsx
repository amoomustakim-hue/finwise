// Add data: upload a real statement (PDF/CSV) or load clearly labelled sample data.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth'
import AppShell from '../components/AppShell'
import { ErrorText } from '../components/ui'
import { card, Icon } from '../app/kit'
import { api, type Mode } from '../lib/api'
import { formatDate } from '../lib/format'
import { useMode } from '../mode'

const BANKS = ['Zenith Bank', 'GTBank', 'Access Bank', 'First Bank', 'UBA', 'OPay', 'Kuda', 'Moniepoint', 'PalmPay', 'Other']

type MonoStatus = { enabled: boolean; testMode: boolean; publicKey: string | null; accounts: unknown[]; customer?: { name: string; email: string } }

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
  const [monoStatus, setMonoStatus] = useState('')
  const [file, setFile] = useState<File | null>(null)

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
        data: { customer: mono.customer ?? { name: user.name, email: user.email } },
        onSuccess: async (result: unknown) => {
          // README shape is { code }; accept a nested { data: { code } } too, just in case.
          const r = result as { code?: string; data?: { code?: string } }
          const code = r?.code ?? r?.data?.code
          if (!code) {
            console.warn('Mono onSuccess without a code', result)
            setError("Mono finished but didn't send a link code. Please try again.")
            setBusy(null)
            return
          }
          setMonoStatus('Bank linked. Importing your transactions…')
          try {
            await api('/mono/exchange', { method: 'POST', body: { code, mode } })
            navigate('/mono/return') // waits for Mono to finish fetching the bank's transactions
          } catch (err) {
            setError((err as Error).message)
            setBusy(null)
          }
        },
        onEvent: (name: string) => {
          // Shows how far the user got, e.g. INSTITUTION_SELECTED, AUTH_PAGE_LOADED, ERROR.
          console.info('Mono event', name)
          if (/error/i.test(name)) setMonoStatus('Mono reported a problem. Please try again.')
        },
        onClose: () => {
          setBusy((b) => (b === 'mono' ? null : b))
          setMonoStatus((s) => (s.startsWith('Bank linked') ? s : 'Mono closed before your bank was linked.'))
        },
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

  const primary = 'flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold transition hover:brightness-110 disabled:opacity-60'

  return (
    <AppShell title="Add transactions">
      <p className="-mt-3 mb-5 text-center text-[13px] text-[#7a7175] lg:-mt-5 lg:text-left">Connect your bank, or upload a statement from your bank app.</p>

      <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          {both && (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#7a7175]">These transactions are for</p>
              <div className="grid grid-cols-2 rounded-[12px] bg-[#f4f2f3] p-1 text-[14px]" role="tablist" aria-label="Mode">
                {(['personal', 'business'] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-[9px] py-2.5 capitalize transition ${mode === m ? 'bg-white font-semibold text-brand shadow-[0_2px_6px_rgb(0_0_0/0.08)]' : 'text-[#5a5155]'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mono?.enabled && (
            <section className="relative overflow-hidden rounded-[18px] bg-brand-grad p-5 text-white">
              <span aria-hidden="true" className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full border-[6px] border-white/10" />
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-white/15 ring-1 ring-white/25">
                  <Icon name="bank" />
                </span>
                {mono.testMode && <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold">Test mode</span>}
              </div>
              <p className="mt-4 text-[18px] font-semibold">Connect your bank</p>
              <p className="mt-1 text-[13px] text-white/80">Link your account securely through Mono. FinWise can only read your transactions. It can't move money.</p>
              <button onClick={connectMono} disabled={busy !== null} className={`${primary} mt-4 bg-white text-brand`}>
                {busy === 'mono' ? 'Opening Mono…' : 'Connect with Mono'}
              </button>
              {monoStatus && <p className="mt-2 text-[13px] text-white/85">{monoStatus}</p>}
              {mono.accounts.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/80">
                  <Icon name="checkCircle" className="h-4 w-4" /> {mono.accounts.length} account(s) linked. They refresh each time you open FinWise.
                </p>
              )}
            </section>
          )}

          <form onSubmit={onImport} className={`${card} flex flex-col gap-4 p-5`}>
            <div>
              <p className="text-[16px] font-semibold">{mono?.enabled ? 'Or upload a statement' : 'Upload a statement'}</p>
              <p className="text-[13px] text-[#7a7175]">Download it from your bank app as a PDF or CSV.</p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-[#7a7175]">Bank</span>
              <span className="relative flex items-center">
                <select name="bankName" required defaultValue="" className="w-full appearance-none rounded-[12px] bg-[#f4f2f3] px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-brand/30">
                  <option value="" disabled>Choose your bank</option>
                  {BANKS.map((b) => <option key={b}>{b}</option>)}
                </select>
                <Icon name="chevronDown" className="pointer-events-none absolute right-3 h-4 w-4" />
              </span>
            </label>
            <label className="flex cursor-pointer flex-col items-center rounded-[14px] border-[1.5px] border-dashed border-brand/30 bg-[#fff8fa] px-4 py-6 text-center transition hover:border-brand/60 focus-within:border-brand">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-blush text-brand">
                <Icon name={file ? 'checkCircle' : 'upload'} />
              </span>
              <span className="mt-2.5 max-w-full truncate text-[14px] font-semibold">{file ? file.name : 'Choose your statement'}</span>
              <span className="text-[12px] text-[#8a8185]">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · tap to change` : 'PDF or CSV'}</span>
              <input name="file" type="file" accept=".pdf,.csv,application/pdf,text/csv" required className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <ErrorText>{error}</ErrorText>
            <button type="submit" disabled={busy !== null} className={`${primary} bg-brand text-white shadow-[0_14px_28px_-14px_rgb(152_0_66/0.7)]`}>
              {busy === 'import' ? 'Reading statement…' : 'Import statement'}
            </button>
          </form>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {result && (
            <section className="rounded-[18px] bg-[#e2f3ea] p-5 text-[13px] text-[#1f6b4f]">
              <p className="flex items-center gap-2 text-[15px] font-semibold">
                <Icon name="checkCircle" /> Imported {result.imported} transactions
              </p>
              <p className="mt-1">
                {formatDate(result.from)} to {formatDate(result.to)}
              </p>
              {result.duplicates > 0 && <p className="mt-1">{result.duplicates} were already in FinWise and were skipped.</p>}
              {result.notRead > 0 && <p className="mt-1">{result.notRead} lines couldn't be read.</p>}
              {result.balanceCheck.checked > 0 && (
                <p className="mt-1">Balance check: {result.balanceCheck.matched} of {result.balanceCheck.checked} running balances match.</p>
              )}
              <Link to="/transactions" className="mt-3 inline-flex items-center gap-1 font-semibold">
                See transactions <Icon name="chevron" className="h-4 w-4" />
              </Link>
            </section>
          )}

          <section className={`${card} p-5`}>
            <p className="text-[15px] font-semibold">How it works</p>
            <ul className="mt-3 flex flex-col gap-3 text-[13px] text-[#4a4246]">
              {[
                ['upload', 'Upload or connect', 'Your bank statement or a linked account.'],
                ['grid', 'We sort it', 'Every transaction gets a category; FinWise asks you about the unclear ones.'],
                ['brain', 'See what\u2019s coming', 'Your overview, analytics and insights update straight away.'],
              ].map(([icon, t, b]) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-blush text-brand">
                    <Icon name={icon as 'upload'} className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block font-semibold text-[#1a1215]">{t}</span>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[18px] bg-[#fff4e0] p-5">
            <p className="text-[15px] font-semibold text-[#7a4b00]">No statement handy?</p>
            <p className="mt-1 text-[13px] text-[#7a4b00]">Load realistic sample data to explore FinWise. It's clearly marked as sample data and can be removed anytime.</p>
            <button onClick={loadDemo} disabled={busy !== null} className={`${primary} mt-4 bg-white text-[#7a4b00] ring-1 ring-[#f2d29b]`}>
              {busy === 'demo' ? 'Loading…' : 'Load sample data'}
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
