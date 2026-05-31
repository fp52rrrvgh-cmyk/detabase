create table if not exists public.finance_daily_spending_limits (
  user_id              uuid not null primary key default auth.uid(),
  daily_limit_amount   bigint not null check (daily_limit_amount > 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.finance_daily_spending_limits enable row level security;

create policy "Users can view own daily limit"
  on public.finance_daily_spending_limits for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily limit"
  on public.finance_daily_spending_limits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily limit"
  on public.finance_daily_spending_limits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own daily limit"
  on public.finance_daily_spending_limits for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete
  on public.finance_daily_spending_limits
  to authenticated;
