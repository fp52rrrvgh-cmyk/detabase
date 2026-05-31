-- Add 'digital_account' to the account_type CHECK constraint.
-- Digital accounts represent PayPal, crypto exchanges, Line Pay, etc.

alter table public.finance_accounts
  drop constraint finance_accounts_account_type_check;

alter table public.finance_accounts
  add constraint finance_accounts_account_type_check
    check (account_type in ('cash', 'bank', 'credit_card', 'stored_value', 'digital_account', 'other'));
