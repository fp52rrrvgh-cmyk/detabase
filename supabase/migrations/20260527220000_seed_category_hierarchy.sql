-- Seed initial category hierarchy for 小新
-- Structure:
--   支出 (expense)
--   ├─ 燃料
--   │  ├─ 加油
--   │  └─ 尿素
--   ├─ 餐飲
--   │  ├─ 早餐
--   │  ├─ 午餐
--   │  ├─ 晚餐
--   │  ├─ 宵夜
--   │  └─ 點心
--   ├─ 香菸
--   ├─ 車貸
--   ├─ 保險
--   ├─ 保養維修
--   ├─ 通行費
--   ├─ 停車
--   ├─ 日用品
--   ├─ 飲料
--   ├─ 零食
--   └─ 娛樂
--   收入 (income)
--   └─ 薪資
--
-- UUIDs for existing categories (from production):
--   96652e55-... = 支出
--   f3a57033-... = 加油
--   b7ecbbda-... = 餐飲
--   262e7d72-... = 香菸
--   5dfe3aef-... = 收入
--   b8487e55-... = 薪資

-- Helper: get user_id from any existing category
do $$
declare
  v_user_id uuid;
  v_fuel_id uuid;
  v_breakfast_id uuid;
  v_lunch_id uuid;
  v_dinner_id uuid;
  v_night_snack_id uuid;
  v_snack_id uuid;
  v_car_loan_id uuid;
  v_insurance_id uuid;
  v_maintenance_id uuid;
  v_toll_id uuid;
  v_parking_id uuid;
  v_daily_goods_id uuid;
  v_drinks_id uuid;
  v_treats_id uuid;
  v_entertainment_id uuid;
  v_urea_id uuid;
begin
  -- Get the user_id from the first category
  select user_id into v_user_id from public.finance_categories limit 1;

  if v_user_id is null then
    raise exception 'No categories found - seed some first';
  end if;

  -- 1. Insert new second-level categories under 支出
  insert into public.finance_categories (user_id, display_name, grouping_purpose, parent_id, is_active)
  values
    (v_user_id, '燃料', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '車貸', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '保險', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '保養維修', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '通行費', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '停車', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '日用品', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '飲料', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '零食', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true),
    (v_user_id, '娛樂', 'expense',
      (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id),
      true);

  -- 2. Get the new 燃料 id
  select id into v_fuel_id
  from public.finance_categories
  where display_name = '燃料' and user_id = v_user_id;

  -- 3. Add subcategories under 燃料
  -- Move 加油 to 燃料
  update public.finance_categories
  set parent_id = v_fuel_id
  where display_name = '加油' and user_id = v_user_id;

  -- Add 尿素
  insert into public.finance_categories (user_id, display_name, grouping_purpose, parent_id, is_active)
  values (v_user_id, '尿素', 'expense', v_fuel_id, true);

  -- 4. Get existing 餐飲 id
  -- Already has parent = 支出, setting that now
  update public.finance_categories
  set parent_id = (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id)
  where display_name = '餐飲' and user_id = v_user_id;

  -- Add subcategories under 餐飲
  insert into public.finance_categories (user_id, display_name, grouping_purpose, parent_id, is_active)
  values
    (v_user_id, '早餐', 'expense', (select id from public.finance_categories where display_name = '餐飲' and user_id = v_user_id), true),
    (v_user_id, '午餐', 'expense', (select id from public.finance_categories where display_name = '餐飲' and user_id = v_user_id), true),
    (v_user_id, '晚餐', 'expense', (select id from public.finance_categories where display_name = '餐飲' and user_id = v_user_id), true),
    (v_user_id, '宵夜', 'expense', (select id from public.finance_categories where display_name = '餐飲' and user_id = v_user_id), true),
    (v_user_id, '點心', 'expense', (select id from public.finance_categories where display_name = '餐飲' and user_id = v_user_id), true);

  -- 5. Move 香菸 under 支出
  update public.finance_categories
  set parent_id = (select id from public.finance_categories where display_name = '支出' and user_id = v_user_id)
  where display_name = '香菸' and user_id = v_user_id;

  -- 6. Move 薪資 under 收入
  update public.finance_categories
  set parent_id = (select id from public.finance_categories where display_name = '收入' and user_id = v_user_id)
  where display_name = '薪資' and user_id = v_user_id;

  raise notice 'Category hierarchy seeded successfully';
end $$;
