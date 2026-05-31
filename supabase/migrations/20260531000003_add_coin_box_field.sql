-- Add is_coin_box boolean flag for cash accounts.
-- Coin boxes are reminder-based savings, not automatic cash flow.

alter table public.finance_accounts
  add column if not exists is_coin_box boolean not null default false;

-- Constraint: coin box must be a cash account.
alter table public.finance_accounts
  add constraint finance_accounts_coin_box_cash_only
    check (
      not is_coin_box
      or (is_coin_box = true and account_type = 'cash')
    );

-- Constraint: coin box cannot have credit / loan fields.
alter table public.finance_accounts
  add constraint finance_accounts_coin_box_no_credit
    check (
      not is_coin_box
      or (
        is_coin_box = true
        and credit_limit is null
        and billing_day is null
        and total_loan is null
        and loan_term_months is null
        and interest_rate is null
      )
    );

-- Optional partial index for fast coin box queries.
create index if not exists finance_accounts_coin_box_idx
  on public.finance_accounts (user_id)
  where is_coin_box = true;
