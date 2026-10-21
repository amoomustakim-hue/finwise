// Passwords, sessions and rate limiting.
// Sessions: a random token lives in an HttpOnly cookie; only its SHA-256 hash is stored.
import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from './db.js'
import { HttpError } from './http.js'

const COOKIE = 'fw_session'
const SESSION_DAYS = 30
const BCRYPT_ROUNDS = 10

// Rate limit: failed sign-ins allowed per window. Per-IP is looser because a venue's
// shared Wi-Fi (e.g. demo day) puts many people behind one IP.
const MAX_ATTEMPTS = { email: 5, ip: 30 }
const WINDOW_MINUTES = 15

export type User = {
  id: string
  name: string
  email: string
  uses_personal: boolean
  uses_business: boolean
  business_name: string | null
  onboarded: boolean
  is_demo: boolean
  expires_at: string | null
}

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS)
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash)

// A real bcrypt hash of a random string: compared against when the email doesn't exist,
// so "no such user" takes the same time as "wrong password".
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), BCRYPT_ROUNDS)
export const dummyCheck = (password: string) => bcrypt.compare(password, DUMMY_HASH)

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** Create a session row and return the Set-Cookie header value. */
export async function startSession(userId: string, request: Request, days = SESSION_DAYS): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await db()`
    insert into sessions (user_id, token_hash, expires_at)
    values (${userId}, ${sha256(token)}, now() + make_interval(days => ${days}))`
  return sessionCookie(token, days * 86400, request)
}

/** Delete the current session (if any) and return a cookie that clears it. */
export async function endSession(request: Request): Promise<string> {
  const token = readCookie(request, COOKIE)
  if (token) await db()`delete from sessions where token_hash = ${sha256(token)}`
  return sessionCookie('', 0, request)
}

/** The signed-in user, or null. */
export async function currentUser(request: Request): Promise<User | null> {
  const token = readCookie(request, COOKIE)
  if (!token) return null
  const rows = (await db()`
    select u.id, u.name, u.email, u.uses_personal, u.uses_business, u.business_name, u.onboarded, u.is_demo, u.expires_at
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()
      and (u.expires_at is null or u.expires_at > now())`) as User[]
  return rows[0] ?? null
}

/** Like currentUser, but throws 401 when signed out. */
export async function requireUser(request: Request): Promise<User> {
  const user = await currentUser(request)
  if (!user) throw new HttpError(401, 'Please sign in')
  return user
}

/** Throws 429 if this key has too many recent failures. */
export async function assertNotRateLimited(key: string): Promise<void> {
  const rows = (await db()`
    select count from login_attempts
    where key = ${key} and window_start > now() - make_interval(mins => ${WINDOW_MINUTES})`) as { count: number }[]
  const limit = key.startsWith('ip:') ? MAX_ATTEMPTS.ip : MAX_ATTEMPTS.email
  if ((rows[0]?.count ?? 0) >= limit) {
    throw new HttpError(429, `Too many attempts. Try again in ${WINDOW_MINUTES} minutes.`)
  }
}

/** Count a failed attempt; starts a fresh window if the old one expired. */
export async function recordFailure(key: string): Promise<void> {
  await db()`
    insert into login_attempts (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when login_attempts.window_start > now() - make_interval(mins => ${WINDOW_MINUTES})
                   then login_attempts.count + 1 else 1 end,
      window_start = case when login_attempts.window_start > now() - make_interval(mins => ${WINDOW_MINUTES})
                          then login_attempts.window_start else now() end`
}

export async function clearFailures(key: string): Promise<void> {
  await db()`delete from login_attempts where key = ${key}`
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

function sessionCookie(value: string, maxAge: number, request: Request): string {
  // Secure only over HTTPS so local http://localhost dev still works.
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}
