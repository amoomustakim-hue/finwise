// The ONLY module that talks to an AI provider. Swap providers here without touching callers.
// Callers must treat LlmUnavailable as normal and fall back to rules/templates.
import type { z } from 'zod'

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

// Models confirmed available on our Groq key (GET /openai/v1/models, 2026-10-21).
const MODELS = {
  fast: 'openai/gpt-oss-20b', // cheap classification / small extraction
  smart: 'openai/gpt-oss-120b', // insight wording, harder extraction
} as const

export class LlmUnavailable extends Error {}

type JsonRequest<T extends z.ZodType> = {
  system: string
  user: string
  schema: T
  model?: keyof typeof MODELS
  maxTokens?: number
  timeoutMs?: number
}

/** Ask the model for a JSON object and validate it. Throws LlmUnavailable on any failure. */
export async function llmJson<T extends z.ZodType>(req: JsonRequest<T>): Promise<z.infer<T>> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new LlmUnavailable('GROQ_API_KEY not set')

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELS[req.model ?? 'fast'],
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        response_format: { type: 'json_object' },
        reasoning_effort: 'low',
        temperature: 0,
        max_completion_tokens: req.maxTokens ?? 2000,
      }),
      signal: AbortSignal.timeout(req.timeoutMs ?? 20_000),
    })
  } catch (err) {
    throw new LlmUnavailable(`request failed: ${(err as Error).message}`)
  }

  if (!res.ok) {
    // 429 = rate limited (free tier: 8K tokens/min). Never retry inline; callers fall back.
    const detail = await res.text().catch(() => '')
    throw new LlmUnavailable(`HTTP ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new LlmUnavailable('empty response')

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new LlmUnavailable('response was not JSON')
  }
  const result = req.schema.safeParse(parsed)
  if (!result.success) throw new LlmUnavailable(`invalid shape: ${result.error.issues[0]?.message}`)
  return result.data
}
