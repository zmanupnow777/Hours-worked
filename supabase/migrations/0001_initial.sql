create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null,
  name text not null,
  contact_name text not null default '',
  default_hourly_rate_cents integer not null,
  currency text not null default 'USD',
  color text not null default '#db5c33',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null,
  client_id uuid not null references clients(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz null,
  duration_minutes integer null,
  notes text not null default '',
  source text not null check (source in ('timer', 'manual')),
  hourly_rate_cents integer not null,
  invoice_id uuid null,
  draft_invoice_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null,
  client_id uuid not null references clients(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null check (status in ('open', 'drafted', 'finalized')),
  last_drafted_at timestamptz null,
  closed_at timestamptz null,
  unique (client_id, period_start, period_end)
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null,
  client_id uuid not null references clients(id) on delete cascade,
  period_id uuid not null references invoice_periods(id) on delete cascade,
  invoice_number text not null,
  status text not null check (status in ('draft', 'finalized')),
  issue_date date not null,
  period_start date not null,
  period_end date not null,
  currency text not null default 'USD',
  subtotal_cents integer not null default 0,
  total_minutes integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, period_start, period_end)
);

create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  session_id uuid not null references work_sessions(id) on delete cascade,
  description text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  minutes integer not null,
  rate_cents integer not null,
  amount_cents integer not null,
  excluded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  id text primary key,
  owner_id uuid null,
  timezone text not null default 'America/La_Paz',
  monthly_close_day integer not null default 1,
  monthly_close_hour integer not null default 9,
  auto_draft_enabled boolean not null default true,
  cron_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table clients enable row level security;
alter table work_sessions enable row level security;
alter table invoice_periods enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table app_settings enable row level security;
