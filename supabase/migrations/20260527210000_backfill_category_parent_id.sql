-- Backfill parent_id for finance_categories based on display_name pattern
-- Convention: "母分類 - 子分類" (e.g. "餐飲 - 早餐")
-- Only for categories where display_name contains ' - '

update public.finance_categories child
set parent_id = parent.id
from public.finance_categories parent
where
  child.parent_id is null
  and child.display_name like '% - %'
  and parent.display_name = split_part(child.display_name, ' - ', 1)
  and parent.is_active = true
  and parent.id != child.id
  and child.user_id = parent.user_id;
