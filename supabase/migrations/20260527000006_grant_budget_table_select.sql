-- Grant table-level SELECT on finance_budgets to authenticated role
-- The RLS policies control row-level access; table-level SELECT is still needed.
grant select on public.finance_budgets to authenticated;

-- Also ensure the budget_alerts view can access categories (already select-granted
-- by Supabase default, but explicit is better)
grant select on public.finance_categories to authenticated;
