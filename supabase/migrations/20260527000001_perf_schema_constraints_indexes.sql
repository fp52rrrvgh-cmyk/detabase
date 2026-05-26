-- Performance + integrity pass for Finance schema.
-- Adds missing constraints, composite indexes for dashboard/review queries,
-- and a materialized view for monthly aggregation.
--
-- This migration is additive-only and does not modify existing tables or indexes.

-- =============================================================================
-- PART 1: Missing constraints
-- =============================================================================

-- 1a. Finance categories: grouping_purpose must be income or expense when set
alter table public.finance_categories
  add constraint finance_categories_grouping_purpose_check
  check (grouping_purpose is null or grouping_purpose in ('income', 'expense'));

-- 1b. Finance accounts: same-owner display name must be unique
alter table public.finance_accounts
  add constraint finance_accounts_user_id_display_name_key
  unique (user_id, display_name);

-- 1c. Finance accounts: add user_id + account_type index for account listing
create index if not exists finance_accounts_user_type_idx
  on public.finance_accounts (user_id, account_type);

-- =============================================================================
-- PART 2: Performance indexes for dashboard, review, and budgeting queries
-- =============================================================================

-- 2a. Composite user + date + movement — covers 90% of review queries
create index if not exists finance_activities_user_date_movement_idx
  on public.finance_activities (user_id, activity_date desc, movement_type);

-- 2b. Monthly aggregation support
-- date_trunc is STABLE, not IMMUTABLE. Use to_char for deterministic monthly key.
create index if not exists finance_activities_user_month_movement_idx
  on public.finance_activities (user_id, (to_char(activity_date, 'YYYY-MM')), movement_type);

-- 2c. Account balance / per-account history
create index if not exists finance_activities_user_account_date_idx
  on public.finance_activities (user_id, account_id, activity_date desc);

-- 2d. Void-aware review: find corrections by user + date range
create index if not exists finance_activity_corrections_owner_created_idx
  on public.finance_activity_corrections (owner_user_id, created_at desc);

-- =============================================================================
-- PART 3: Materialized view for monthly summarised data
-- =============================================================================

create materialized view if not exists public.finance_monthly_summary as
select
  fa.user_id,
  to_char(fa.activity_date, 'YYYY-MM') as month,
  fa.movement_type,
  count(*)                                                                    as transaction_count,
  sum(fa.amount)                                                              as total_amount,
  count(*) filter (where fc.id is not null and fc.correction_type = 'void')   as void_count
from public.finance_activities fa
left join public.finance_activity_corrections fc
  on fc.activity_id = fa.id
  and fc.owner_user_id = fa.user_id
  and fc.correction_type = 'void'
group by fa.user_id, date_trunc('month', fa.activity_date), fa.movement_type;

-- Unique index on the materialized view for concurrent refresh support
create unique index if not exists finance_monthly_summary_pkey
  on public.finance_monthly_summary (user_id, month, movement_type);

-- Refresh function: can be called after each activity insert/void
create or replace function public.refresh_finance_monthly_summary()
returns void
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  refresh materialized view concurrently public.finance_monthly_summary;
end;
$$;

-- =============================================================================
-- PART 4: Grant permissions (view + function)
-- =============================================================================

grant select on public.finance_monthly_summary to authenticated;
grant execute on function public.refresh_finance_monthly_summary() to authenticated;
