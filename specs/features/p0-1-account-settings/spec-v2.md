# P0 #1 帳戶設定 — Spec v2

**任務 ID**: P0-001-implement
**狀態**: ✅ 已批准實作
**設計來源**: `specs/features/p0-1-account-settings/design.md` (Architect)
**工兵官**: OPC Builder

---

## 1. 任務摘要

在 **AccountsTab** 新增 `is_coin_box` 零錢盒標記功能（含 migration + UI toggle + Dashboard 標示），同時強化 `initial_balance` UI 體驗，讓小新可以將任何現金帳戶標記為零錢盒以實現 reminder-based 儲蓄管理。

---

## 2. 範圍

### ✅ 包含

| 項目 | 說明 |
|------|------|
| Migration: `20260531000001_add_coin_box_field.sql` | 新增 `is_coin_box` 欄位 + check constraints |
| AccountsTab UI: coin box toggle | 新增/編輯表單中的開關 |
| AccountsTab UI: coin box badge | 帳戶列表行顯示 🪙 標示 |
| AccountsTab UI: initial_balance 強化 | Placeholder 優化「例如：100000」、或前綴 TWD |
| Dashboard: `useDashboard.ts` 修改 | AccountSummary 加 `isCoinBox`，select 補 `is_coin_box` |
| Dashboard: 零錢盒標示 | 帳戶總覽顯示 🪙 |
| AccountsTab: 年末結算按鈕（coming-soon placeholder） | 僅顯示 🎯 圖示 + 「年末結算（敬請期待）」提示文字，無後端功能 |
| Quick-capture 帳戶選單 | 零錢盒選項標示 🪙 |
| Edge Function: `ai-get-user-refs` | 回傳 `is_coin_box` 標記 |
| 新增 `specs/sop/codex-task-p0-1-implement.json` | Codex CLI 任務包 |

### ❌ 不包含

| 項目 | 原因 |
|------|------|
| 年末結算轉帳後端邏輯 | P1 實作 |
| 零錢盒餘額在 Dashboard 獨立顯示一行 | 非必選，可後續補 |
| Budgets / Subscriptions 邏輯修改 | 正交功能，無需異動 |
| 舊資料搬遷 | Staging only，無 production |
| 自動金流（零錢盒自動累計） | 零錢盒是 reminder-based，非自動金流 |
| git commit / push | 實作後由小馬手動處理 |
| 修改 Supabase RLS 策略 | 現有 RLS 已完整覆蓋 |

---

## 3. UI 需求

### 3.1 新增表單 — Coin Box Toggle

**位置**：`AccountsTab.tsx` 新增表單中，在「初始餘額」欄位（第 403-408 行）**下方**、`renderConditionalFields(newType, "new")`（第 409 行）**之前**插入。

```
┌─────────────────────────────────────┐
│ 帳戶名稱      [例如：玉山銀行      ] │
│ 帳戶類型      [現金 ▼              ] │
│ 初始餘額      [例如：100000        ] │
│                                     │
│ ┌─ 🪙 零錢盒 ──────────────────┐   │
│ │ [🔘] 啟用零錢盒模式            │   │
│ │                                │   │
│ │ 零錢盒是提醒式儲蓄，            │   │
│ │ 不自動影響帳戶餘額。            │   │
│ │ 年末可提醒你結算轉帳。          │   │
│ └────────────────────────────────┘   │
│ 描述（選填）  [備註...           ] │
│ [新增帳戶]                          │
└─────────────────────────────────────┘
```

**Toggle 行為規則**：

| 情境 | 行為 |
|------|------|
| `account_type` 不是 `'cash'` | Toggle 隱藏（或 disabled） |
| 切換 `is_coin_box = true` | 清空 `credit_limit` / `billing_day` / `total_loan` / `loan_term_months` / `interest_rate` state |
| 切換 `account_type` 從 cash 到非 cash | 自動關閉 toggle（設為 false） |
| 新增時 toggle 為 true | `handleAdd` body 包含 `is_coin_box: true` |

**行動優先**：Toggle 最小觸控面積 44×44px，iOS 風格。

### 3.2 編輯表單 — Coin Box Toggle

**位置**：`AccountsTab.tsx` 編輯表單中（第 293-323 行），在「初始餘額」欄位（第 309-312 行）**下方**、`renderConditionalFields(editType, "edit")`（第 313 行）**之前**插入。

- 從 `acct.is_coin_box` 讀取初始值
- 行為規則同新增表單
- `handleUpdate` body 包含 `is_coin_box` 欄位

### 3.3 帳戶列表行 — 🪙 Badge

在 `renderAccountRow` 第 331 行的 `<span className="acct-type-badge">` 旁邊插入：

```tsx
{acct.is_coin_box && <span className="coin-badge" style={{...}}>🪙 零錢盒</span>}
```

視覺：金色/綠色 badge，粗體，字型 0.8rem。

### 3.4 `initial_balance` UI 強化

| 現狀 | 強化後 |
|------|--------|
| placeholder="例：0" | placeholder="例如：100000" |
| 無前綴 | 可考慮 label 改為「初始餘額 (TWD)」 |
| 預設值 0 | 保持不變 |

### 3.5 Dashboard 帳戶總覽標示

在 Dashboard 帳戶列表中，零錢盒帳戶顯示：

```
🪙 零錢盒 · TWD 5,000
```

在 `AccountSummary` type 增加 `isCoinBox` 後，前端元件讀取 `isCoinBox` 標示 🪙。

### 3.6 Quick-capture 帳戶選單標示

在帳戶下拉選項中，零錢盒帳戶顯示 `🪙 零錢盒` 標示，讓使用者知道這是零錢盒。

---

## 4. Schema 變更

### 4.1 新 Migration

**檔名**: `supabase/migrations/20260531000001_add_coin_box_field.sql`

```sql
-- Add is_coin_box boolean flag for cash accounts
-- Coin boxes are reminder-based savings, not automatic cash flow

alter table public.finance_accounts
  add column if not exists is_coin_box boolean not null default false;

-- Constraint: coin box must be a cash account
alter table public.finance_accounts
  add constraint finance_accounts_coin_box_cash_only
    check (
      not is_coin_box
      or (is_coin_box = true and account_type = 'cash')
    );

-- Constraint: coin box cannot have credit / loan fields
alter table public.finance_accounts
  add constraint finance_accounts_coin_box_no_credit
    check (
      not is_coin_box
      or (
        is_coin_box = true
        and credit_limit is null
        and billing_day is null
        and total_loan is null
        and loan_term_months is null
        and interest_rate is null
      )
    );

-- Optional partial index for fast coin box queries
create index if not exists finance_accounts_coin_box_idx
  on public.finance_accounts (user_id)
  where is_coin_box = true;
```

### 4.2 關於 `account_type` check constraint

**無需更新**。現有 constraint 定義為：

```sql
check (account_type in ('cash', 'bank', 'credit_card', 'stored_value', 'digital_account', 'other'))
```

零錢盒使用現有 `'cash'` 類型，不需要擴充 constraint。`digital_account` 已透過 `20260529000001_add_digital_account_type.sql` 加入（使用 drop + recreate 方式）。

### 4.3 Grant

現有 migration `20260527230000` 已 GRANT insert/update/delete 給 authenticated。新增欄位後自動涵蓋，不需額外 GRANT。

### 4.4 RLS

現有策略 `"Users manage own finance accounts"`（user_id = auth.uid()）已完整覆蓋，不需異動。

---

## 5. Data Flow

### 5.1 新增零錢盒帳戶

```
使用者填寫表單
  → account_type 選「現金」
  → is_coin_box toggle = true
  → handleAdd() 建構 body:
      {
        user_id: "...",
        display_name: "日常零錢盒",
        account_type: "cash",
        initial_balance: 0,
        is_coin_box: true,
        credit_limit: null,       // 自動清空
        billing_day: null,        // 自動清空
        total_loan: null,         // 自動清空
        loan_term_months: null,   // 自動清空
        interest_rate: null,      // 自動清空
      }
  → POST /rest/v1/finance_accounts
  → DB check constraint: account_type='cash' ✅
  → DB check constraint: credit/loan all NULL ✅
  → RLS: user_id = auth.uid() ✅
```

### 5.2 編輯零錢盒帳戶

```
startEdit(acct) → 讀取 acct.is_coin_box 初始化 toggle
→ 編輯表單顯示 toggle
→ handleUpdate(id) body 包含 is_coin_box
→ PATCH /rest/v1/finance_accounts?id=eq.{id}
```

### 5.3 Dashboard 資料流

```
useDashboard.ts line 143-147:
  .from("finance_accounts")
  .select("id,display_name,account_type,initial_balance,credit_limit,total_loan,is_coin_box")
  //                              補上 is_coin_box ────────────────^^^^^^^^^^^^^^

AccountSummary type:
  export type AccountSummary = {
    id: string;
    displayName: string;
    accountType: string;
    initialBalance: number;
    balance: number;
    creditLimit: number | null;
    totalLoan: number | null;
    currency: string;
    isCoinBox: boolean;  // 新增
  };

Account mapping:
  const accounts: AccountSummary[] = allAccounts.map((a) => ({
    ...
    isCoinBox: a.is_coin_box,  // 新增
  }));
```

### 5.4 Quick-capture 資料流

讀取帳戶清單時，現有 query 補上 `is_coin_box`，前端在選項中顯示 `🪙 零錢盒` 標示。

### 5.5 AI 語音記帳資料流

`ai-get-user-refs` Edge Function 回傳帳戶對照表時，增加 `is_coin_box` 欄位。AI 解析自然語言「存 500 到零錢盒」→ 對照零錢盒 ID → 寫入 income 記錄。

---

## 6. 檔案修改清單

| 檔案 | 修改類型 | 修改說明 |
|------|---------|---------|
| `supabase/migrations/20260531000001_add_coin_box_field.sql` | **新增** | 新 migration |
| `apps/web/app/settings/AccountsTab.tsx` | 修改 | 新增 is_coin_box 支援 |
| `apps/web/app/dashboard/hooks/useDashboard.ts` | 修改 | AccountSummary 加 isCoinBox |
| `apps/web/app/dashboard/components/DashboardView.tsx`（或對應元件）| 修改 | 零錢盒 🪙 標示 |
| `supabase/functions/ai-get-user-refs/index.ts` | 修改 | 回傳 is_coin_box |
| Quick-capture 元件（`apps/web/app/...`） | 修改 | 帳戶選單標示 🪙 |

---

## 7. 驗收標準

- [ ] Migration `20260531000001_add_coin_box_field.sql` 可成功執行（冪等）
- [ ] `is_coin_box` 欄位在 DB 中正確建立，預設值為 false
- [ ] check constraint `finance_accounts_coin_box_cash_only` 正確生效（非 cash 帳戶不可設零錢盒）
- [ ] check constraint `finance_accounts_coin_box_no_credit` 正確生效（零錢盒不可有 credit/loan 資料）
- [ ] 新增表單：account_type 為 cash 時顯示 toggle
- [ ] 新增表單：toggle 開關後，提交的 body 包含 `is_coin_box: true`
- [ ] 新增表單：toggle 開關時，credit/loan 相關 state 自動清空
- [ ] 編輯表單：正確讀取 `acct.is_coin_box` 初始化 toggle
- [ ] 編輯表單：toggle 變化正確寫入 DB
- [ ] 帳戶列表行顯示 🪙 badge（當 is_coin_box = true）
- [ ] Dashboard AccountSummary 包含 `isCoinBox` 欄位
- [ ] Dashboard 帳戶查詢 select 包含 `is_coin_box`
- [ ] Quick-capture 帳戶選單標示 🪙
- [ ] `ai-get-user-refs` 回傳 `is_coin_box`
- [ ] `npm run build` 通過
- [ ] 無 TypeScript 編譯錯誤
- [ ] 切換 account_type 從 cash 到非 cash 時自動關閉 toggle
- [ ] Toggle 在 iOS Safari 上最小觸控面積 44×44px
- [ ] `initial_balance` placeholder 從「例：0」改為「例如：100000」
