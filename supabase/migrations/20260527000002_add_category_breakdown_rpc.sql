-- Add RPC for dashboard category breakdown
create or replace function public.get_monthly_category_breakdown()
returns table (
  category_name text,
  total_amount numeric
)
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_current_month int := extract(year from current_date)::int * 100 + extract(month from current_date)::int;
begin
  return query
  select
    coalesce(fc.display_name, '未分類') as category_name,
    sum(fa.amount) as total_amount
  from public.finance_activities fa
  left join public.finance_categories fc on fc.id = fa.category_id
  where fa.user_id = auth.uid()
    and fa.movement_type = 'expense'
    and (extract(year from fa.activity_date)::int * 100 + extract(month from fa.activity_date)::int) = v_current_month
    and not exists (
      select 1 from public.finance_activity_corrections corr
      where corr.activity_id = fa.id
        and corr.correction_type = 'void'
        and corr.owner_user_id = fa.user_id
    )
  group by fc.display_name
  order by total_amount desc;
end;
$$;

grant execute on function public.get_monthly_category_breakdown() to authenticated;
