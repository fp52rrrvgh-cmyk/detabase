create table public.finance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movement_type text not null check (movement_type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  currency text not null default 'TWD' check (currency = 'TWD'),
  category_id uuid not null,
  account_id uuid not null,
  description text not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  next_date date not null,
  is_active boolean not null default true,
  skip_count integer not null default 0,
  last_generated_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_category_fk
    foreign key (user_id, category_id)
    references public.finance_categories(user_id, id),
  constraint subscription_account_fk
    foreign key (user_id, account_id)
    references public.finance_accounts(user_id, id)
);

create index finance_subscriptions_user_idx on public.finance_subscriptions (user_id);
create index finance_subscriptions_next_date_idx on public.finance_subscriptions (next_date)
  where is_active = true;

alter table public.finance_subscriptions enable row level security;

create policy "Users manage own subscriptions"
  on public.finance_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Grant table-level DML to authenticated
grant select, insert, update, delete on public.finance_subscriptions to authenticated;

-- Grant read for service_role (for ai-process-subscriptions Edge Function)
grant select, insert, update on public.finance_subscriptions to service_role;
