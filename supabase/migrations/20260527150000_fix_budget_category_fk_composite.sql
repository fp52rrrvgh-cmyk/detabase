-- Fix finance_budgets category foreign key to reference composite (user_id, category_id)
-- Previously it only referenced categories(id), which is inconsistent with
-- the rest of the schema (finance_activities uses (user_id, category_id)).
-- Note: This requires dropping the old FK and creating a new one.
-- RLS still provides runtime protection, this fixes schema consistency.
alter table public.finance_budgets
  drop constraint if exists finance_budgets_category_id_fkey;

alter table public.finance_budgets
  add constraint finance_budgets_category_owner_fkey
  foreign key (user_id, category_id)
  references public.finance_categories(user_id, id)
  on delete cascade;
