-- Grant table-level INSERT, UPDATE on finance_budgets to authenticated role
-- RLS policies handle row-level access; table-level INSERT+UPDATE are still needed.
grant insert, update on public.finance_budgets to authenticated;
