# Spec: Phase 2 — 固定訂閱 + 帳戶對帳 + 智慧提醒

## Objective
在現有 detabase 系統上，新增三大功能，讓財務管理從被動記錄進化到主動管理。

## 一、固定支出/收入訂閱

### 功能
- 使用者設定每月/每週/每年固定發生的收支（如房租、保險、薪資）
- 系統每月自動產生對應的 `finance_activities` 記錄
- Dashboard 顯示「即將到期的訂閱」
- 支援啟用/停用、修改金額、手動跳過一期

### Schema — `finance_subscriptions`
```sql
create table public.finance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movement_type text not null check (movement_type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  currency text not null default 'TWD' check (currency = 'TWD'),
  category_id uuid not null,
  account_id uuid not null,
  description text not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  next_date date not null,
  is_active boolean not null default true,
  skip_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_category_fk foreign key (user_id, category_id) references public.finance_categories(user_id, id),
  constraint subscription_account_fk foreign key (user_id, account_id) references public.finance_accounts(user_id, id)
);
```

### API
- `POST /rest/v1/finance_subscriptions` — 新增/修改訂閱（REST upsert）
- `DELETE /rest/v1/finance_subscriptions?id=eq.X` — 停用（前端 soft delete: is_active=false）
- AI Edge Function `ai-process-subscriptions` — 每月定時執行，產生到期 transaction

### 前端頁面
- `/subscriptions` 頁面：列出所有訂閱、可編輯、啟用/停用
- Dashboard 增加「即將扣款」卡片

## 二、帳戶對帳

### 功能
- 匯入 CSV 對帳單
- 系統自動比對銀行紀錄 vs 系統紀錄
- 顯示差異列表
- 支援快速標記已對帳

### Schema — `finance_reconciliation` / `finance_reconciliation_items`
```sql
create table public.finance_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  statement_date date not null,
  statement_balance numeric not null,
  system_balance numeric not null,
  difference numeric not null generated always as (system_balance - statement_balance) stored,
  status text not null default 'pending' check (status in ('pending', 'matched', 'adjusted')),
  notes text,
  created_at timestamptz not null default now(),
  constraint reconciliation_account_fk foreign key (user_id, account_id) references public.finance_accounts(user_id, id)
);

create table public.finance_reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references public.finance_reconciliations(id) on delete cascade,
  source text not null check (source in ('system', 'statement')),
  description text,
  amount numeric not null,
  transaction_date date,
  match_status text not null default 'unmatched' check (match_status in ('matched', 'unmatched', 'ignored')),
  match_activity_id uuid references public.finance_activities(id),
  created_at timestamptz not null default now()
);
```

### API
- Edge Function `reconcile-account` — POST: body 含 CSV text + 帳戶 ID，回傳比對結果
- 前端顯示比對結果，使用者確認後標記 matched

### 前端頁面
- `/reconciliation` 頁面：選擇帳戶、貼上 CSV、看比對結果、確認

## 三、智慧提醒

### 功能
- **預算警報**：當單一分類支出達到預算 80%/100% 時，推 Telegram 通知
- **訂閱提醒**：訂閱到期前 3 天推通知
- **每日戰報**：每日早上 8:00 推送昨日支出摘要 + 預算狀況

### 實現方式
全部用 Hermes cron job + Telegram 推播：
- `budget-alert-watcher` cron：每小時檢查 budget_alerts view，超支時推播
- `subscription-reminder` cron：每天檢查 next_date <= today+3 的訂閱
- `daily-briefing` cron：每天早上 8:00 推昨日戰報

## 成功標準
1. 訂閱功能：使用者可在 `/subscriptions` 新增/編輯/停用訂閱，系統每月自動產生記錄
2. 對帳功能：使用者可貼上 CSV，系統顯示比對結果
3. 提醒功能：預算超過 80%/100% 時 Telegram 自動通知

## 實作順序
1. `finance_subscriptions` schema + migration + RLS
2. `/subscriptions` 前端頁面
3. Dashboard 加入訂閱卡片
4. `finance_reconciliation` schema + migration + RLS
5. `/reconciliation` 前端頁面 + CSV 解析
6. 智慧提醒 cron jobs
7. 全系統 code review + deploy
