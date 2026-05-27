-- Seed default classification rules for any authenticated user.
-- This uses a DO block to insert rules for each user who doesn't have them yet.
-- Rules are ordered by keyword length (most specific first is preferred).

do $$
declare
  rec record;
begin
  for rec in select id from auth.users loop
    
    -- Avoid duplicates: skip if user already has any rules
    if not exists (select 1 from public.finance_classification_rules where user_id = rec.id) then
      
      -- Get default account IDs for expense/income
      -- We can't know these statically, so we only insert category rules
      
      -- Insert common expense keyword rules
      insert into public.finance_classification_rules (user_id, keyword, movement_type, is_enabled) values
        (rec.id, '加油',   'expense', true),
        (rec.id, '汽油',   'expense', true),
        (rec.id, '柴油',   'expense', true),
        (rec.id, '停車',   'expense', true),
        (rec.id, '停車費', 'expense', true),
        (rec.id, '過路費', 'expense', true),
        (rec.id, 'etag',   'expense', true),
        (rec.id, '便當',   'expense', true),
        (rec.id, '午餐',   'expense', true),
        (rec.id, '晚餐',   'expense', true),
        (rec.id, '早餐',   'expense', true),
        (rec.id, '全聯',   'expense', true),
        (rec.id, '家樂福', 'expense', true),
        (rec.id, '7-11',   'expense', true),
        (rec.id, '全家',   'expense', true),
        (rec.id, '萊爾富', 'expense', true),
        (rec.id, '飲料',   'expense', true),
        (rec.id, '咖啡',   'expense', true),
        (rec.id, '手搖',   'expense', true),
        (rec.id, '運費',   'expense', true),
        (rec.id, '水費',   'expense', true),
        (rec.id, '電費',   'expense', true),
        (rec.id, '瓦斯費', 'expense', true),
        (rec.id, '房租',   'expense', true),
        (rec.id, '月租',   'expense', true),
        (rec.id, '手機',   'expense', true),
        (rec.id, '電信',   'expense', true),
        (rec.id, '保險',   'expense', true),
        (rec.id, '健保',   'expense', true),
        (rec.id, '勞保',   'expense', true),
        (rec.id, '罰單',   'expense', true),
        (rec.id, '維修',   'expense', true),
        (rec.id, '保養',   'expense', true),
        (rec.id, '輪胎',   'expense', true),
        (rec.id, '停車費', 'expense', true),
        (rec.id, '薪水',   'income', true),
        (rec.id, '薪資',   'income', true),
        (rec.id, '獎金',   'income', true),
        (rec.id, '紅包',   'income', true);
      
    end if;
  end loop;
end;
$$;
