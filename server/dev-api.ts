// Vite dev-server plugin: sends every /api/* request through api/router.ts, exactly as
// vercel.json does in production, so `npm run dev` runs front end and API together.
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'

export function devApi(): Plugin {
  return {
    name: 'finwise-dev-api',
    apply: 'serve',
    configureServer(server) {
      // Load .env / .env.local (all keys, not just VITE_*) into the server process only.
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()

        try {
          const router = await server.ssrLoadModule('/api/router.ts')

          // Convert the Node request into a Web Request, like Vercel's runtime does.
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const request = new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          })

          const response: Response = await router.dispatch(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          server.ssrFixStacktrace(err as Error)
          next(err)
        }
      })
    },
  }
}
