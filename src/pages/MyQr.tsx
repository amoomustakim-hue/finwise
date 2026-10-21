// "My QR": the code customers/friends scan to pay you. One per mode (personal / business).
import QRCode from 'qrcode'
import { useEffect, useState, type FormEvent } from 'react'
import { payLink } from '../../shared/payqr'
import { useAuth } from '../auth'
import AppShell from '../components/AppShell'
import { Button, ErrorText, TextField } from '../components/ui'
import { api } from '../lib/api'
import { useMode } from '../mode'

const BANKS = ['Zenith Bank', 'GTBank', 'Access Bank', 'First Bank', 'UBA', 'Fidelity Bank', 'FCMB', 'Union Bank', 'Sterling Bank', 'Wema Bank', 'OPay', 'Kuda', 'Moniepoint', 'PalmPay', 'Other']
type Profile = { display_name: string; bank_name: string; account_number: string }

export default function MyQr() {
  const { user } = useAuth()
  const { mode } = useMode()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setProfile(undefined)
    api<{ profile: Profile | null }>(`/pay?mode=${mode}`).then((r) => {
      setProfile(r.profile)
      setEditing(!r.profile)
    })
  }, [mode])

  const link = profile ? payLink(window.location.origin, { name: profile.display_name, bank: profile.bank_name, account: profile.account_number }) : ''
  useEffect(() => {
    if (link) QRCode.toDataURL(link, { width: 640, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }).then(setQr)
  }, [link])

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const body = { mode, displayName: String(f.get('displayName')), bankName: String(f.get('bankName')), accountNumber: String(f.get('accountNumber')).replace(/\s/g, '') }
    setError('')
    try {
      await api('/pay', { method: 'PUT', body })
      setProfile({ display_name: body.displayName, bank_name: body.bankName, account_number: body.accountNumber })
      setEditing(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <AppShell title={mode === 'business' ? 'Business QR code' : 'My QR code'}>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          {profile === undefined && <p className="text-slate-500">Loading…</p>}
          {editing && profile !== undefined && (
            <form onSubmit={save} className="flex flex-col gap-4">
              <p className="text-sm text-slate-600">Which account should people pay into when they scan your code?</p>
              <TextField label="Name people will see" name="displayName" required defaultValue={profile?.display_name ?? (mode === 'business' ? user?.business_name ?? '' : user?.name ?? '')} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Bank</span>
                <select name="bankName" required defaultValue={profile?.bank_name ?? ''} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <option value="" disabled>Choose your bank</option>
                  {BANKS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </label>
              <TextField label="Account number" name="accountNumber" inputMode="numeric" pattern="\d{10}" maxLength={10} required defaultValue={profile?.account_number ?? ''} />
              <ErrorText>{error}</ErrorText>
              <Button type="submit">Create my QR code</Button>
            </form>
          )}
          {!editing && profile && qr && (
            <div className="flex flex-col items-center text-center">
              <img src={qr} alt={`QR code to pay ${profile.display_name}`} className="w-64 max-w-full" />
              <p className="mt-3 text-lg font-semibold">{profile.display_name}</p>
              <p className="text-sm text-slate-600">{profile.bank_name} · {profile.account_number}</p>
              <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
                <a href={qr} download={`finwise-qr-${mode}.png`} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Download</a>
                <button onClick={() => window.print()} className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-slate-300">Print</button>
                <button onClick={() => setEditing(true)} className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-slate-300">Change details</button>
              </div>
            </div>
          )}
        </section>
        <section className="rounded-2xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">
          <h2 className="mb-2 font-semibold text-slate-900">How people pay you, even without data</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>They scan your code with FinWise (or any phone camera).</li>
            <li>FinWise shows your name and account, and they type the amount.</li>
            <li>FinWise builds the USSD code for <em>their</em> bank, and they dial it and enter their bank PIN.</li>
            <li>Their bank moves the money. FinWise never touches it.</li>
          </ol>
          <p className="mt-3">Scanning and USSD both work offline, as long as they've opened FinWise once with data.</p>
        </section>
      </div>
    </AppShell>
  )
}
