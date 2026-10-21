// The single Vercel function for the whole API (Vercel Hobby allows only 12 functions).
// vercel.json rewrites /api/<path> -> /api/router?__path=<path>; handlers live in server/routes.
import * as ask from '../server/routes/ask.js'
import * as budgets from '../server/routes/budgets.js'
import * as categorise from '../server/routes/categorise.js'
import * as dashboard from '../server/routes/dashboard.js'
import * as demo from '../server/routes/demo.js'
import * as demoStart from '../server/routes/demo-start.js'
import * as health from '../server/routes/health.js'
import * as imports from '../server/routes/imports.js'
import * as insights from '../server/routes/insights.js'
import * as jobsSync from '../server/routes/jobs-sync.js'
import * as me from '../server/routes/me.js'
import * as push from '../server/routes/push.js'
import * as pushTest from '../server/routes/push-test.js'
import * as review from '../server/routes/review.js'
import * as simulate from '../server/routes/simulate.js'
import * as simulator from '../server/routes/simulator.js'
import * as transactions from '../server/routes/transactions.js'
import * as login from '../server/routes/auth/login.js'
import * as logout from '../server/routes/auth/logout.js'
import * as signup from '../server/routes/auth/signup.js'
import * as monoConnect from '../server/routes/mono/connect.js'
import * as monoExchange from '../server/routes/mono/exchange.js'
import * as monoSync from '../server/routes/mono/sync.js'
import * as monoWebhook from '../server/routes/mono/webhook.js'

type Handler = (request: Request) => Promise<Response>
type RouteModule = Partial<Record<'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', Handler>>

const ROUTES: Record<string, RouteModule> = {
  health,
  me,
  dashboard,
  ask,
  budgets,
  insights,
  push,
  'push/test': pushTest,
  'jobs/sync': jobsSync,
  imports,
  transactions,
  demo,
  'demo/start': demoStart,
  categorise,
  review,
  simulate,
  simulator,
  'auth/signup': signup,
  'auth/login': login,
  'auth/logout': logout,
  'mono/connect': monoConnect,
  'mono/exchange': monoExchange,
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
