create table public.finance_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  statement_date date not null,
  statement_balance numeric not null,
  system_balance numeric not null,
  difference numeric not null generated always as (system_balance - statement_balance) stored,
  status text not null default 'pending' check (status in ('pending', 'matched', 'adjusted')),
  notes text,
  created_at timestamptz not null default now(),
  constraint reconciliation_account_fk
    foreign key (user_id, account_id)
    references public.finance_accounts(user_id, id)
);

create index finance_reconciliations_user_idx on public.finance_reconciliations (user_id);
create index finance_reconciliations_account_idx on public.finance_reconciliations (user_id, account_id, statement_date);

create table public.finance_reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references public.finance_reconciliations(id) on delete cascade,
  source text not null check (source in ('system', 'statement')),
  description text,
  amount numeric not null,
  transaction_date date,
  match_status text not null default 'unmatched' check (match_status in ('matched', 'unmatched', 'ignored')),
  match_activity_id uuid references public.finance_activities(id),
  created_at timestamptz not null default now()
);

create index finance_reconciliation_items_rid_idx on public.finance_reconciliation_items (reconciliation_id);

alter table public.finance_reconciliations enable row level security;
alter table public.finance_reconciliation_items enable row level security;

create policy "Users manage own reconciliations"
  on public.finance_reconciliations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage own reconciliation items"
  on public.finance_reconciliation_items for all to authenticated
  using (
    reconciliation_id in (
      select id from public.finance_reconciliations where user_id = auth.uid()
    )
  ) with check (
    reconciliation_id in (
      select id from public.finance_reconciliations where user_id = auth.uid()
    )
  );

grant select, insert, update on public.finance_reconciliations to authenticated;
grant select, insert, update, delete on public.finance_reconciliation_items to authenticated;
grant select, insert, update on public.finance_reconciliations to service_role;
grant select, insert, update on public.finance_reconciliation_items to service_role;
