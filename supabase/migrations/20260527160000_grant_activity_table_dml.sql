-- Grant table-level SELECT, INSERT, UPDATE on finance_activities to authenticated role.
-- RLS policies handle row-level access; table-level privileges are still required.
grant select, insert, update on public.finance_activities to authenticated;
