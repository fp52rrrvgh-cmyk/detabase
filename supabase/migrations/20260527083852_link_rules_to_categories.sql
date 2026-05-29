-- Update classification rules to link keywords to actual categories and accounts
-- by matching keywords against category display_name.
-- This runs for every user who has classification rules (from the seed migration).
-- Rules without a matching category keep NULL (the front-end will still identify
-- the movement_type, just without auto-filling the category).

do $$
declare
  rec record;
  cat_rec record;
  matched_id uuid;
begin
  -- For each user with classification rules
  for rec in 
    select distinct user_id 
    from public.finance_classification_rules 
    where category_id is null and keyword is not null
  loop
    
    -- Try to match each keyword to a category by display_name similarity
    for cat_rec in
      select id, display_name
      from public.finance_categories
      where user_id = rec.user_id and is_active = true
    loop
      matched_id := null;

      -- Simple heuristic: update rules whose keyword matches part of the category name
      -- e.g., keyword '加油' → category '加油/油資'
      --       keyword '全聯' → category '食品/全聯'
      --       keyword '電費' → category '水電/電費'
      if cat_rec.display_name like '%加油%' or cat_rec.display_name like '%油資%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('加油', '汽油', '柴油');
      end if;

      if cat_rec.display_name like '%交通%' or cat_rec.display_name like '%過路%' or cat_rec.display_name like '%停車%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('停車', '停車費', '過路費', 'etag');
      end if;

      if cat_rec.display_name like '%餐飲%' or cat_rec.display_name like '%便當%' or cat_rec.display_name like '%飲食%' or cat_rec.display_name like '%外食%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('便當', '午餐', '晚餐', '早餐');
      end if;

      if cat_rec.display_name like '%超市%' or cat_rec.display_name like '%賣場%' or cat_rec.display_name like '%購物%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('全聯', '家樂福');
      end if;

      if cat_rec.display_name like '%超商%' or cat_rec.display_name like '%便利%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('7-11', '全家', '萊爾富');
      end if;

      if cat_rec.display_name like '%飲料%' or cat_rec.display_name like '%咖啡%' or cat_rec.display_name like '%手搖%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('飲料', '咖啡', '手搖');
      end if;

      if cat_rec.display_name like '%運費%' or cat_rec.display_name like '%物流%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('運費');
      end if;

      if cat_rec.display_name like '%水電%' or cat_rec.display_name like '%水費%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('水費');
      end if;

      if cat_rec.display_name like '%水電%' or cat_rec.display_name like '%電費%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('電費');
      end if;

      if cat_rec.display_name like '%瓦斯%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('瓦斯費');
      end if;

      if cat_rec.display_name like '%房租%' or cat_rec.display_name like '%租金%' or cat_rec.display_name like '%住宿%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('房租', '月租');
      end if;

      if cat_rec.display_name like '%通訊%' or cat_rec.display_name like '%電信%' or cat_rec.display_name like '%手機%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('手機', '電信', '月租');
      end if;

      if cat_rec.display_name like '%保險%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('保險', '健保', '勞保');
      end if;

      if cat_rec.display_name like '%交通%' or cat_rec.display_name like '%罰單%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('罰單');
      end if;

      if cat_rec.display_name like '%維修%' or cat_rec.display_name like '%修繕%' or cat_rec.display_name like '%保養%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('維修', '保養', '輪胎');
      end if;

      if cat_rec.display_name like '%薪水%' or cat_rec.display_name like '%薪資%' or cat_rec.display_name like '%收入%' then
        update public.finance_classification_rules 
        set category_id = cat_rec.id 
        where user_id = rec.user_id and keyword in ('薪水', '薪資', '獎金', '紅包');
      end if;

    end loop;
  end loop;
end;
$$;
