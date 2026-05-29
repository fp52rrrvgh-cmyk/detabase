-- Grant table-level INSERT, UPDATE, DELETE on finance_categories to authenticated role
-- RLS policies handle row-level access; table-level DML grants are still needed.
grant insert, update, delete on public.finance_categories to authenticated;
