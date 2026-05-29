-- Re-grant table-level privileges for finance_budgets to authenticated role
-- These are needed for RLS policies to work via the Supabase REST API when
-- the caller uses their own auth bearer token (not service_role).
--
-- Supabase's own docs: https://supabase.com/docs/guides/auth/row-level-security
-- "RLS is not a replacement for table-level GRANTs"

-- First revoke to be idempotent (some grants may persist from earlier migrations)
revoke insert, update, select, delete on public.finance_budgets from authenticated;
revoke insert, update, select, delete on public.finance_budgets from anon;

-- Then re-grant what the RLS policies need
grant insert, update, select, delete on public.finance_budgets to authenticated;
