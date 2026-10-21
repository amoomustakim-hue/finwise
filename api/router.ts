// The single Vercel function for the whole API (Vercel Hobby allows only 12 functions).
// vercel.json rewrites /api/<path> -> /api/router?__path=<path>; handlers live in server/routes.
import * as categorise from '../server/routes/categorise.js'
import * as demo from '../server/routes/demo.js'
import * as health from '../server/routes/health.js'
import * as imports from '../server/routes/imports.js'
import * as me from '../server/routes/me.js'
import * as review from '../server/routes/review.js'
import * as simulate from '../server/routes/simulate.js'
import * as transactions from '../server/routes/transactions.js'
import * as login from '../server/routes/auth/login.js'
import * as logout from '../server/routes/auth/logout.js'
import * as signup from '../server/routes/auth/signup.js'
import * as monoConnect from '../server/routes/mono/connect.js'
import * as monoSync from '../server/routes/mono/sync.js'
import * as monoWebhook from '../server/routes/mono/webhook.js'

type Handler = (request: Request) => Promise<Response>
type RouteModule = Partial<Record<'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', Handler>>

const ROUTES: Record<string, RouteModule> = {
  health,
  me,
  imports,
  transactions,
  demo,
  categorise,
  review,
  simulate,
  'auth/signup': signup,
  'auth/login': login,
  'auth/logout': logout,
  'mono/connect': monoConnect,
  'mono/sync': monoSync,
  'mono/webhook': monoWebhook,
}

/** Route path from the rewrite's __path param, falling back to the URL path (/api/<path>). */
export function routePath(url: URL): string {
  const fromRewrite = url.searchParams.get('__path')
  const raw = fromRewrite ?? url.pathname.replace(/^\/api\/?/, '')
  return raw.replace(/^\/+|\/+$/g, '')
}

export async function dispatch(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const route = ROUTES[routePath(url)]
  if (!route) return Response.json({ error: 'Not found' }, { status: 404 })
  const handler = route[request.method as keyof RouteModule]
  if (!handler) return Response.json({ error: 'Method not allowed' }, { status: 405 })
  return handler(request)
}

export const GET = dispatch
export const POST = dispatch
export const PATCH = dispatch
export const PUT = dispatch
export const DELETE = dispatch
