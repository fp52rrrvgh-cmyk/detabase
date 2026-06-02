-- Create finance_debts table for Debt Module v1.
-- Manual debt tracker + monthly action workflow.
-- Payment ledger will be a separate v2 migration.

create table if not exists public.finance_debts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  debt_type     text not null default 'other'
                check (debt_type in ('credit_card', 'loan', 'installment', 'personal', 'other')),
  creditor      text not null default '',
  principal     numeric not null check (principal > 0),
  remaining     numeric not null check (remaining >= 0),
  interest_rate numeric not null default 0 check (interest_rate >= 0),
  min_payment   numeric not null default 0 check (min_payment >= 0),
  next_due_date date,
  priority      text not null default 'manual'
                check (priority in ('manual', 'interest', 'smallest_balance')),
  status        text not null default 'active'
                check (status in ('active', 'closed')),
  notes         text not null default '',
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS: users can only see their own debts
alter table public.finance_debts enable row level security;

create policy "Users can view their own debts"
  on public.finance_debts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own debts"
  on public.finance_debts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own debts"
  on public.finance_debts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own debts"
  on public.finance_debts for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists finance_debts_user_id_idx on public.finance_debts(user_id);
create index if not exists finance_debts_status_idx on public.finance_debts(status);
create index if not exists finance_debts_next_due_date_idx on public.finance_debts(next_due_date);

-- Auto-update updated_at
create or replace function public.update_finance_debts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_finance_debts_updated_at
  before update on public.finance_debts
  for each row execute function public.update_finance_debts_updated_at();

-- Grant access
grant select, insert, update, delete on public.finance_debts to authenticated;
grant select, insert, update, delete on public.finance_debts to service_role;
