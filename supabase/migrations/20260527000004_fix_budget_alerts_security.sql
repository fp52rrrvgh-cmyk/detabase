-- Fix budget alerts view: use security_invoker so it respects RLS
-- The view was created without security_invoker, so anon role can't access
-- the underlying tables even when the caller has a valid session.

create or replace view public.finance_budget_alerts
with (security_invoker = true)
as
select
  b.id as budget_id,
  b.user_id,
  b.category_id,
  c.display_name as category_name,
  b.budget_year,
  b.budget_month,
  b.limit_amount,
  coalesce((
    select sum(fa.amount)
    from public.finance_activities fa
    where fa.user_id = b.user_id
      and fa.category_id = b.category_id
      and fa.movement_type = 'expense'
      and extract(year from fa.activity_date) = b.budget_year
      and extract(month from fa.activity_date) = b.budget_month
      and not exists (
        select 1 from public.finance_activity_corrections fc
        where fc.activity_id = fa.id
          and fc.correction_type = 'void'
      )
  ), 0) as spent_amount,
  case
    when coalesce((
      select sum(fa.amount)
      from public.finance_activities fa
      where fa.user_id = b.user_id
        and fa.category_id = b.category_id
        and fa.movement_type = 'expense'
        and extract(year from fa.activity_date) = b.budget_year
        and extract(month from fa.activity_date) = b.budget_month
        and not exists (
          select 1 from public.finance_activity_corrections fc
          where fc.activity_id = fa.id
            and fc.correction_type = 'void'
        )
    ), 0) >= b.limit_amount then 'exceeded'
    when coalesce((
      select sum(fa.amount)
      from public.finance_activities fa
      where fa.user_id = b.user_id
        and fa.category_id = b.category_id
        and fa.movement_type = 'expense'
        and extract(year from fa.activity_date) = b.budget_year
        and extract(month from fa.activity_date) = b.budget_month
        and not exists (
          select 1 from public.finance_activity_corrections fc
          where fc.activity_id = fa.id
            and fc.correction_type = 'void'
        )
    ), 0) >= (b.limit_amount * 0.8) then 'warning'
    else 'ok'
  end as alert_level
from public.finance_budgets b
join public.finance_categories c on c.id = b.category_id;
