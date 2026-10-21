// Database schema, as an ordered list of migrations.
// Each migration is a list of single SQL statements (Neon's HTTP driver runs one per call).
// Never edit a migration that has run in production; add a new one instead.

export const migrations: { id: string; statements: string[] }[] = [
  {
    id: '001_core',
    statements: [
      `create extension if not exists pgcrypto`,

      // People using FinWise. Mode flags say which dashboards they see.
      `create table users (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        email text not null unique,
        password_hash text not null,
        uses_personal boolean not null default false,
        uses_business boolean not null default false,
        business_name text,
        onboarded boolean not null default false,
        created_at timestamptz not null default now()
      )`,

      // Login sessions. Only a SHA-256 hash of the cookie token is stored.
      `create table sessions (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        token_hash text not null unique,
        expires_at timestamptz not null,
        created_at timestamptz not null default now()
      )`,
      `create index sessions_user_idx on sessions(user_id)`,

      // Simple fixed-window rate limit for sign-in attempts (keyed by email and by IP).
      `create table login_attempts (
        key text primary key,
        count integer not null default 0,
        window_start timestamptz not null default now()
      )`,

      // Bank accounts a user connected (Mono) or imported (statement / CSV), or demo data.
      `create table accounts (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        mode text not null check (mode in ('personal', 'business')),
        bank_name text not null,
        account_name text,
        account_number_last4 text,
        source text not null check (source in ('mono', 'import', 'demo')),
        mono_account_id text unique,
        created_at timestamptz not null default now()
      )`,
      `create index accounts_user_idx on accounts(user_id)`,

      // Every transaction from every source, in one shape. Money is in kobo (integer).
      `create table transactions (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        account_id uuid not null references accounts(id) on delete cascade,
        mode text not null check (mode in ('personal', 'business')),
        source text not null check (source in ('mono', 'import', 'demo', 'manual')),
        external_id text,
        dedupe_key text not null,
        occurred_at timestamptz not null,
        amount_kobo bigint not null check (amount_kobo > 0),
        direction text not null check (direction in ('credit', 'debit')),
        narration text not null,
        balance_after_kobo bigint,
        kind text check (kind in ('income', 'expense', 'internal_transfer', 'refund', 'other')),
        category text,
        category_status text not null default 'pending'
          check (category_status in ('pending', 'suggested', 'confirmed')),
        category_confidence real,
        scope text check (scope in ('personal', 'business')),
        created_at timestamptz not null default now(),
        unique (user_id, dedupe_key)
      )`,
      `create index transactions_user_mode_date_idx on transactions(user_id, mode, occurred_at desc)`,
      `create index transactions_pending_idx on transactions(user_id, category_status) where category_status <> 'confirmed'`,

      // What the user taught us: "this merchant/recipient is always X".
      `create table category_rules (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        mode text not null check (mode in ('personal', 'business')),
        match_key text not null,
        category text not null,
        created_at timestamptz not null default now(),
        unique (user_id, mode, match_key)
      )`,

      // Monthly category budgets (virtual allocations, not bank balances).
      `create table budgets (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        mode text not null check (mode in ('personal', 'business')),
        category text not null,
        period_month date not null,
        amount_kobo bigint not null check (amount_kobo >= 0),
        unique (user_id, mode, category, period_month)
      )`,
    ],
  },
  {
    id: '002_categorise_and_mono',
    statements: [
      // Where a category came from: keyword rule, the user's own rule, AI, or the user directly.
      `alter table transactions add column category_source text
        check (category_source in ('rule', 'user_rule', 'ai', 'user'))`,
      // Normalised merchant/recipient key, used to remember "always X" corrections.
      `alter table transactions add column match_key text`,
      // AI is only tried once per transaction (free tier is tight).
      `alter table transactions add column ai_tried boolean not null default false`,
      `create index transactions_match_key_idx on transactions(user_id, mode, match_key)`,

      // Pending Mono Connect links: ties Mono's meta.ref back to a user and mode.
      `create table mono_links (
        ref text primary key,
        user_id uuid not null references users(id) on delete cascade,
        mode text not null check (mode in ('personal', 'business')),
        created_at timestamptz not null default now()
      )`,
      `alter table accounts add column mono_data_status text`,
      `alter table accounts add column last_synced_at timestamptz`,
    ],
  },
  {
    id: '003_insight_wording_cache',
    statements: [
      // AI-written wording for a set of insights, keyed by a hash of the underlying numbers,
      // so the same facts are only sent to the AI once (free tier is 8K tokens/minute).
      `create table insight_wording (
        user_id uuid not null references users(id) on delete cascade,
        facts_hash text not null,
        wording jsonb not null,
        created_at timestamptz not null default now(),
        primary key (user_id, facts_hash)
      )`,
    ],
  },
  {
    id: '004_push_and_pay',
    statements: [
      // One row per device/browser that allowed notifications.
      `create table push_subscriptions (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references users(id) on delete cascade,
        endpoint text not null unique,
        p256dh text not null,
        auth text not null,
        created_at timestamptz not null default now()
      )`,
      `create index push_subscriptions_user_idx on push_subscriptions(user_id)`,
      // The account people should pay into when they scan this user's QR (per mode).
      // Shared publicly by design (it's what you'd write on a receipt), so stored in full.
      `create table pay_profiles (
        user_id uuid not null references users(id) on delete cascade,
        mode text not null check (mode in ('personal', 'business')),
        display_name text not null,
        bank_name text not null,
        account_number text not null check (account_number ~ '^[0-9]{10}$'),
        updated_at timestamptz not null default now(),
        primary key (user_id, mode)
      )`,
    ],
  },
  {
    id: '005_drop_pay_profiles',
    // Offline QR payments were removed from the product (2026-10-21).
    statements: [`drop table if exists pay_profiles`],
  },
]
