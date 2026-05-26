-- Grant select on budget_alerts view to authenticated role
-- (security_invoker + grant = anon can't touch it, authenticated users can)

grant select on public.finance_budget_alerts to authenticated;
