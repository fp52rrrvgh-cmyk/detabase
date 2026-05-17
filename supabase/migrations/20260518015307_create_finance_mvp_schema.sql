-- Finance MVP initial schema migration.
-- UUID default: gen_random_uuid(), documented by Supabase as a Postgres built-in UUIDv4 generator.
-- No extension is created in this migration.
-- This migration defines schema only; it does not include seed data, reporting behavior, or legacy Sheets/GAS logic.

create table public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  account_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint finance_accounts_account_type_check
    check (account_type in ('cash', 'bank', 'credit_card', 'stored_value', 'other'))
);

create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  grouping_purpose text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  amount numeric not null,
  currency text not null default 'TWD',
  movement_type text not null,
  account_id uuid not null references public.finance_accounts(id),
  category_id uuid references public.finance_categories(id),
  description text,
  source_indicator text not null,
  source_system_name text,
  source_record_reference text,
  merchant_or_payee text,
  payment_method text,
  transfer_pairing_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint finance_activities_amount_positive_check
    check (amount > 0),

  constraint finance_activities_currency_check
    check (currency = 'TWD'),

  constraint finance_activities_movement_type_check
    check (movement_type in ('income', 'expense', 'transfer', 'adjustment')),

  constraint finance_activities_source_indicator_check
    check (source_indicator in ('manual', 'import_reference', 'comparison_reference')),

  constraint finance_activities_category_required_check
    check (
      (movement_type in ('income', 'expense') and category_id is not null)
      or movement_type in ('transfer', 'adjustment')
    )
);

create index finance_activities_activity_date_idx
  on public.finance_activities (activity_date);

create index finance_activities_account_id_idx
  on public.finance_activities (account_id);

create index finance_activities_category_id_idx
  on public.finance_activities (category_id);

create index finance_activities_movement_type_idx
  on public.finance_activities (movement_type);

alter table public.finance_accounts enable row level security;
alter table public.finance_categories enable row level security;
alter table public.finance_activities enable row level security;

create policy "Users manage own finance accounts"
  on public.finance_accounts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own finance categories"
  on public.finance_categories
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own finance activities"
  on public.finance_activities
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
