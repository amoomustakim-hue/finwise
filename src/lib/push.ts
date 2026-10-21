// Browser side of notifications: register the service worker, ask permission, subscribe.
import { api } from './api'

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** iPhones only deliver web push to apps added to the Home Screen (iOS 16.4+). */
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline features unavailable; the app still works online */
      })
    })
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** Ask permission and subscribe this browser. Returns false if the user said no. */
export async function enablePush(): Promise<boolean> {
  const { publicKey } = await api<{ publicKey: string | null }>('/push')
  if (!publicKey) throw new Error('Notifications are not set up on the server yet')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }))
  await api('/push', { method: 'POST', body: sub.toJSON() })
  return true
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  await api('/push', { method: 'DELETE', body: { endpoint: sub.endpoint } })
  await sub.unsubscribe()
}
