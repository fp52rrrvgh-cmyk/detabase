-- Grant table-level DELETE on finance_budgets to authenticated role
-- RLS delete policy exists (created in 20260527000003_create_budgets.sql)
-- but table-level DELETE grant was missing — only INSERT, UPDATE was granted.
grant delete on public.finance_budgets to authenticated;
