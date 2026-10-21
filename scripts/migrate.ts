// Applies pending migrations to the database in DATABASE_URL.
// Run: npm run db:migrate   (reads .env.local)
import { neon } from '@neondatabase/serverless'
import { migrations } from '../server/migrations.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set (run via npm run db:migrate)')
const sql = neon(url)

await sql.query(`create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
)`)

const applied = new Set(
  ((await sql.query('select id from schema_migrations')) as { id: string }[]).map((r) => r.id),
)

for (const m of migrations) {
  if (applied.has(m.id)) {
    console.log(`skip   ${m.id}`)
    continue
  }
  // Run the migration's statements plus its bookkeeping row in one transaction.
  await sql.transaction([
    ...m.statements.map((s) => sql.query(s)),
    sql.query('insert into schema_migrations (id) values ($1)', [m.id]),
  ])
  console.log(`apply  ${m.id}`)
}
console.log('migrations up to date')
