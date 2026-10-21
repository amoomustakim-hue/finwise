// Single place that creates the Postgres client for all API functions.
// Uses Neon's HTTP driver: no persistent connections, ideal for Vercel serverless.
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { parseEnv } from '@neon/env'
import config from '../neon.js'

let client: NeonQueryFunction<false, false> | null = null

/** Lazily build the client so a missing env var fails the request, not the import. */
export function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const { postgres } = parseEnv(config, ['DATABASE_URL'])
    client = neon(postgres.databaseUrl)
  }
  return client
}
