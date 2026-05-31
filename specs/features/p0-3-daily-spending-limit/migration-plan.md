# Migration Plan — P0-3 Daily Spending Limit

## 建立時間
2026-05-31 15:41 CST

## Migration 檔案
`supabase/migrations/20260531000001_create_daily_spending_limits.sql`

## 操作清單

### 1. 建表
```sql
create table if not exists public.finance_daily_spending_limits (
  user_id              uuid not null primary key default auth.uid(),
  daily_limit_amount   bigint not null check (daily_limit_amount > 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
```

### 2. RLS 啟用
```sql
alter table public.finance_daily_spending_limits enable row level security;
```

### 3. RLS Policies（4 個）
| Policy | Operation | Check |
|--------|-----------|-------|
| Users can view own daily limit | SELECT | auth.uid() = user_id |
| Users can insert own daily limit | INSERT | auth.uid() = user_id |
| Users can update own daily limit | UPDATE | auth.uid() = user_id |
| Users can delete own daily limit | DELETE | auth.uid() = user_id |

### 4. GRANT authenticated
```sql
grant select, insert, update, delete
  on public.finance_daily_spending_limits
  to authenticated;
```

## 依賴
- 不依賴其他表（獨立新表）
- 不修改既有表

## 回退方案
```sql
drop table if exists public.finance_daily_spending_limits;
```

## 注意事項
- `user_id` 是 PK，每人一筆，無獨立 id 欄位
- 無 `is_auto` 欄位
- GRANT authenticated 參考 `supabase/migrations/20260527081144_revoke_budget_grants_and_reapply.sql` 的 pattern
