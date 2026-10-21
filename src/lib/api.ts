// Typed fetch wrapper for our own /api. Throws ApiError with the server's message.

export type User = {
  id: string
  name: string
  email: string
  uses_personal: boolean
  uses_business: boolean
  business_name: string | null
  onboarded: boolean
}

export type Mode = 'personal' | 'business'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? 'GET',
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong')
  return data as T
}
