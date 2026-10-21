// Scan to pay — works signed out and OFFLINE (once the app has been opened online).
// 1) scan a FinWise QR (decoded on the phone)  2) enter amount  3) pick YOUR bank
// 4) copy the USSD code or open the dialer  5) your bank asks for your PIN and moves the money.
import jsQR from 'jsqr'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { parsePayLink, type PayTarget } from '../../shared/payqr'
import { telLink, transferCode, USSD_BANKS } from '../../shared/ussd'
import { formatNaira } from '../lib/format'
import { isIos } from '../lib/push'

const BANK_KEY = 'fw_payer_bank'

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function Scanner({ onResult }: { onResult: (t: PayTarget) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('Point your camera at a FinWise QR code')

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch {
        setError('Camera not available. Allow camera access, or ask for the payment link instead.')
        return
      }
      const video = videoRef.current!
      video.srcObject = stream
      await video.play().catch(() => {})
      const tick = () => {
        if (stopped) return
        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
          if (code?.data) {
            const target = parsePayLink(code.data)
            if (target) return onResult(target)
            setHint("That isn't a FinWise payment code")
          }
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onResult])

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-white/80" />
      </div>
      <p className="mt-2 text-center text-sm text-slate-600">{error || hint}</p>
    </div>
  )
}

export default function Pay() {
  const online = useOnline()
  const [target, setTarget] = useState<PayTarget | null>(() => parsePayLink(window.location.hash))
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState(() => {
    try {
      return localStorage.getItem(BANK_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [copied, setCopied] = useState('')

  const bank = USSD_BANKS.find((b) => b.bank === bankName)
  const naira = Number(amount.replace(/[^\d]/g, '')) || 0
  const code = bank && target && naira > 0 ? transferCode(bank, naira, target.account) : null

  function chooseBank(name: string) {
    setBankName(name)
    try {
      localStorage.setItem(BANK_KEY, name)
    } catch {
      /* remembered for this visit only */
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      setCopied('')
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link to="/home" className="text-xl font-bold text-brand">FinWise</Link>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${online ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
          {online ? 'Online' : 'Offline: still works'}
        </span>
      </header>
      <h1 className="text-2xl font-bold">Scan to pay</h1>

      {!target ? (
        <Scanner onResult={setTarget} />
      ) : (
        <>
          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">You're paying</p>
            <p className="text-lg font-semibold">{target.name}</p>
            <p className="text-sm text-slate-600">{target.bank} · {target.account}</p>
            <button onClick={() => { setTarget(null); history.replaceState(null, '', '/pay') }} className="mt-2 text-xs font-semibold text-slate-500 underline">
              Scan a different code
            </button>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Amount</span>
              <div className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 focus-within:border-brand">
                <span className="text-slate-500">₦</span>
                <input inputMode="numeric" className="w-full text-lg outline-none" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Pay from your bank</span>
              <select value={bankName} onChange={(e) => chooseBank(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                <option value="" disabled>Choose your bank</option>
                {USSD_BANKS.map((b) => <option key={b.bank}>{b.bank}</option>)}
              </select>
            </label>
          </section>

          {bank && naira > 0 && (
            <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              {code ? (
                <>
                  <p className="text-sm text-slate-600">Dial this to send {formatNaira(naira * 100)} to {target.name}:</p>
                  <p className="rounded-xl bg-slate-100 px-3 py-3 text-center font-mono text-xl font-semibold tracking-wide">{code}</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => copy(code, 'code')} className="rounded-xl bg-brand py-3 font-semibold text-white">
                      {copied === 'code' ? 'Copied ✓' : 'Copy code'}
                    </button>
                    {!isIos() && (
                      <a href={telLink(code)} className="rounded-xl py-3 text-center font-semibold ring-1 ring-slate-300">
                        Open dialer
                      </a>
                    )}
                  </div>
                  {isIos() && <p className="text-xs text-slate-500">On iPhone: copy the code, open your Phone app, paste and call.</p>}
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    We don't have a ready-made transfer code for {bank.bank}. Dial <span className="font-mono font-semibold">{bank.base}</span>, choose Transfer, and use these details:
                  </p>
                  <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2">
                    <span className="font-mono">{target.account}</span>
                    <button onClick={() => copy(target.account, 'account')} className="text-sm font-semibold text-brand">{copied === 'account' ? 'Copied ✓' : 'Copy'}</button>
                  </div>
                  {!isIos() && <a href={telLink(bank.base)} className="rounded-xl py-3 text-center font-semibold ring-1 ring-slate-300">Open {bank.base}</a>}
                </>
              )}
              {!bank.verified && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  ! Before you enter your PIN, check that your bank's screen shows {formatNaira(naira * 100)} and the name {target.name}. USSD codes can change.
                </p>
              )}
              <p className="text-xs text-slate-500">Your bank moves the money and asks for your own PIN. FinWise never sees it. USSD works without mobile data.</p>
            </section>
          )}
        </>
      )}
    </main>
  )
}
