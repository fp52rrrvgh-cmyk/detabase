-- Grant service_role SELECT on reference tables for Edge Functions
GRANT SELECT ON public.finance_categories TO service_role;
GRANT SELECT ON public.finance_accounts TO service_role;
