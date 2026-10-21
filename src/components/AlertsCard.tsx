// "Get alerts for new transactions" — turns on push notifications for this device.
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { currentSubscription, disablePush, enablePush, isInstalled, isIos, pushSupported } from '../lib/push'

export default function AlertsCard() {
  const [state, setState] = useState<'loading' | 'unsupported' | 'ios-install' | 'off' | 'on' | 'blocked'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      if (isIos() && !isInstalled()) return setState('ios-install')
      if (!pushSupported() || !import.meta.env.PROD) return setState('unsupported')
      if (Notification.permission === 'denied') return setState('blocked')
      setState((await currentSubscription()) ? 'on' : 'off')
    })().catch(() => setState('unsupported'))
  }, [])

  async function turnOn() {
    setMsg('')
    try {
      const ok = await enablePush()
      if (!ok) return setState('blocked')
      setState('on')
      await api('/push/test', { method: 'POST', body: {} })
      setMsg('Done. We just sent you a test alert.')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  async function turnOff() {
    await disablePush()
    setState('off')
    setMsg('')
  }

  if (state === 'loading') return null
  return (
    <section className="rounded-[18px] bg-white p-4 ring-1 ring-black/[0.06] lg:p-5">
      <h2 className="font-semibold">Transaction alerts</h2>
      {state === 'on' && (
        <>
          <p className="mt-1 text-sm text-[#6a6165]">On for this device. We'll alert you when new transactions arrive and ask what they were for.</p>
          <button onClick={turnOff} className="mt-2 text-sm font-semibold text-[#8a8185] underline">Turn off</button>
        </>
      )}
      {state === 'off' && (
        <>
          <p className="mt-1 text-sm text-[#6a6165]">Get a notification when new money moves in your linked accounts.</p>
          <button onClick={turnOn} className="mt-3 w-full rounded-[12px] bg-brand py-2 text-sm font-semibold text-white">Turn on alerts</button>
        </>
      )}
      {state === 'blocked' && <p className="mt-1 text-sm text-[#6a6165]">Notifications are blocked for FinWise. Allow them in your browser's site settings, then reload.</p>}
      {state === 'ios-install' && (
        <p className="mt-1 text-sm text-[#6a6165]">On iPhone, alerts work once FinWise is on your Home Screen: tap Share, then "Add to Home Screen", and open it from there.</p>
      )}
      {state === 'unsupported' && <p className="mt-1 text-sm text-[#6a6165]">This browser can't receive alerts. Try Chrome on Android or desktop.</p>}
      {msg && <p className="mt-2 text-xs text-[#1f8a5b]">{msg}</p>}
    </section>
  )
}
