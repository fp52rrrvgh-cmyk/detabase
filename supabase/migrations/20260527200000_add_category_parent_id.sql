-- Add parent_id to finance_categories for parent-child hierarchy
-- parent_id = null means top-level parent category
-- parent_id = uuid means child of that category

alter table public.finance_categories
  add column parent_id uuid
    references public.finance_categories(id)
    on delete set null;

create index finance_categories_parent_id_idx
  on public.finance_categories (parent_id);

-- Allow authenticated users to update parent_id
-- (already has full DML from grant_category_dml)
