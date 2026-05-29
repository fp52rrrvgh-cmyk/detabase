-- Add account management fields to finance_accounts

alter table public.finance_accounts
  add column if not exists initial_balance bigint not null default 0,
  add column if not exists credit_limit bigint,
  add column if not exists billing_day smallint
    check (billing_day is null or (billing_day >= 1 and billing_day <= 31)),
  add column if not exists total_loan bigint,
  add column if not exists loan_term_months smallint,
  add column if not exists interest_rate numeric(5,2),
  add column if not exists description text;

-- Grant table-level DML to authenticated (already has select from migration 20260527005900)
grant insert, update, delete on public.finance_accounts to authenticated;

-- Allow service_role SELECT (already granted from 20260527005900)
-- Service role already has SELECT on finance_accounts
