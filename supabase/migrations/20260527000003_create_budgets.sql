-- Budget management for detabase.
-- Each user sets monthly budget limits per category.
--
-- RLS: user_id = auth.uid() (same pattern as all finance_* tables)

-- =============================================================================
-- 1. finance_budgets table
-- =============================================================================
create table if not exists public.finance_budgets (
  id            uuid not null default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  category_id   uuid not null,
  -- Budget period: year + month (1-12)
  budget_year   integer not null check (budget_year >= 2020 and budget_year <= 2099),
  budget_month  integer not null check (budget_month >= 1 and budget_month <= 12),
  -- Amount limit in TWD cents (positive integer)
  limit_amount  bigint not null check (limit_amount > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint finance_budgets_pkey primary key (id),
  constraint finance_budgets_category_fkey
    foreign key (category_id) references public.finance_categories(id)
    on delete cascade,
  -- One budget per category per month per user
  constraint finance_budgets_user_category_month_unique
    unique (user_id, category_id, budget_year, budget_month)
);

-- =============================================================================
-- 2. Indexes
-- =============================================================================
-- Primary query: load all budgets for a user in a given month
create index if not exists finance_budgets_user_month_idx
  on public.finance_budgets (user_id, budget_year, budget_month);

-- =============================================================================
-- 3. RLS
-- =============================================================================
alter table public.finance_budgets enable row level security;

-- Users can only see their own budgets
create policy "Users can view own budgets"
  on public.finance_budgets for select
  using (auth.uid() = user_id);

-- Users can insert their own budgets
create policy "Users can insert own budgets"
  on public.finance_budgets for insert
  with check (auth.uid() = user_id);

-- Users can update their own budgets
create policy "Users can update own budgets"
  on public.finance_budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own budgets
create policy "Users can delete own budgets"
  on public.finance_budgets for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- 4. Helper: budget alert view (spending vs limit per category)
-- =============================================================================
create or replace view public.finance_budget_alerts as
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
join public.finance_categories c on c.id = b.category_id
where b.user_id = auth.uid()
  and c.user_id = auth.uid();
