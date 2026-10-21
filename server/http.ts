// Small helpers shared by every API function.
import type { z } from 'zod'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Parse and validate a JSON body; throws a 400 with a readable message on failure. */
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new HttpError(400, 'Request body must be JSON')
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? 'Invalid request')
  }
  return result.data
}

/** Wrap a handler so thrown HttpErrors become JSON responses and other errors become a safe 500. */
export function handle(fn: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await fn(request)
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: err.message }, { status: err.status })
      }
      console.error(err)
      return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
  }
}

/** Best-effort client IP from Vercel's proxy headers (used only for rate limiting). */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
