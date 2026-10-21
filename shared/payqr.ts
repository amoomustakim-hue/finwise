// What a FinWise payment QR contains: a link to /pay with the payee's details in the URL fragment.
// Any phone camera can open it (no app needed); the FinWise scanner reads it offline.
// The fragment (#...) is never sent to a server, so scans don't leak payment details into logs.

export type PayTarget = { name: string; bank: string; account: string }

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

export function payLink(origin: string, t: PayTarget): string {
  return `${origin}/pay#p=${b64url(JSON.stringify({ v: 1, n: t.name, b: t.bank, a: t.account }))}`
}

/** Parse a scanned QR / link. Returns null for anything that isn't a valid FinWise payment code. */
export function parsePayLink(text: string): PayTarget | null {
  try {
    const hash = text.includes('#') ? text.slice(text.indexOf('#') + 1) : text
    const p = new URLSearchParams(hash).get('p')
    if (!p) return null
    const d = JSON.parse(unb64url(p)) as { v?: number; n?: unknown; b?: unknown; a?: unknown }
    if (d.v !== 1 || typeof d.n !== 'string' || typeof d.b !== 'string' || typeof d.a !== 'string') return null
    if (!/^\d{10}$/.test(d.a) || d.n.length > 60 || d.b.length > 60) return null
    return { name: d.n, bank: d.b, account: d.a }
  } catch {
    return null
  }
}
