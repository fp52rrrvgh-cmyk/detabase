# P0 #1 設定頁帳戶設計 — 初始金額 + 零錢盒邏輯

**結論：`initial_balance` 已在 schema 與 UI 就位只需補強 UI 體驗；`is_coin_box` 是全新功能，需 1 個 migration + UI toggle + Dashboard 標示。以下為完整架構。**

---

## 1. 資料模型設計

### 1.1 `initial_balance` — 已存在，無需異動

| 項目 | 狀態 |
|------|------|
| 欄位 | `initial_balance bigint not null default 0` ✅ 已存在 |
| Migration | `20260527230000_add_account_management_fields.sql` |
| TypeScript type | `AccountRow.initial_balance: number` ✅ 已存在 |
| 前端 state | `newBalance` / `editBalance` ✅ 已存在 |
| Dashboard 餘額計算 | `balance = initial_balance + income - expense` ✅ 已正確實作 |
| **待辦：UI 強化** | 見 §4 UI 設計 |

### 1.2 `is_coin_box` — 全新功能，採用 boolean 方案

**決策：`is_coin_box boolean not null default false` 直接加在 `finance_accounts` 表**

理由：
- 零錢盒是現金帳戶的**屬性標記**，非獨立帳戶類型
- 小新已確認：`is_coin_box` boolean 方案，零錢盒是現金帳戶上的標記
- 替代方案（`account_type` 擴充為 `cash_coinbox`）會破壞現有 check constraint 且不夠彈性

### 1.3 替代方案評估

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| **A. `is_coin_box boolean`** （採用） | 最小變更、查詢直覺、UI toggle 簡單 | 需補 check constraint | ✅ 最適合 |
| B. 擴充 `account_type` 新增 `cash_coinbox` | 語意明確 | 破壞現有 check constraint、查詢需 OR 條件、類型膨脹 | ❌ |
| C. JSON metadata 欄位 | 最彈性 | 無法 DB 層約束、查詢慢、複雜 | ❌ |

### 1.4 約束條件

`is_coin_box = true` 時必須遵守：
1. `account_type` 必須為 `'cash'`（零錢盒只能是現金帳戶的標記）
2. `credit_limit`, `billing_day`, `total_loan`, `loan_term_months`, `interest_rate` 必須為 NULL（零錢盒沒有信用額度、貸款）
3. 同一 user 不限制多個零錢盒數量，但 UI 提示「已有零錢盒存在」

約束透過 check constraint 實作，不需 trigger。

---

## 2. Migration 計畫

### 2.1 需要 1 個新 migration

**檔名：`20260531000001_add_coin_box_field.sql`**

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
```

### 2.2 無需更新 `account_type` check constraint

現有 `finance_accounts_account_type_check` 維持不變，因為零錢盒使用現有 `'cash'` 類型。

### 2.3 索引

無需新索引。`is_coin_box` 是低選擇率欄位（極少帳戶是零錢盒），單獨索引無效益。可考慮部分索引：

```sql
-- 選擇性：如需快速查詢所有零錢盒
create index if not exists finance_accounts_coin_box_idx
  on public.finance_accounts (user_id)
  where is_coin_box = true;
```

但現有 `finance_accounts` RLS 已過濾 `user_id = auth.uid()`，大部分查詢返回資料量小，索引非必要。

### 2.4 GRANT

現有 migration `20260527005900` 已 GRANT 所有 `finance_accounts` 操作給 authenticated。新增欄位後自動涵蓋，不需額外 GRANT。

---

## 3. API 與 RLS 設計

### 3.1 CRUD 權限

**現有 RLS 策略**（`20260518015307_create_finance_mvp_schema.sql` 第 97-102 行）已完整覆蓋：

```sql
create policy "Users manage own finance accounts"
  on public.finance_accounts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

新增 `is_coin_box` 欄位後，此 RLS 策略「不需異動」。新增帳戶時 `user_id = auth.uid()` 的 check 自動確保零錢盒為本人所有。

### 3.2 `initial_balance` 前端 API 處理

**現狀**：`AccountsTab.tsx` 第 125-130 行與第 194-198 行已正確傳送 `initial_balance`：

```typescript
// handleAdd 第 129 行
initial_balance: parseInt(newBalance, 10) || 0,

// handleUpdate 第 197 行
initial_balance: parseInt(editBalance, 10) || 0,
```

**強化建議**：對於零錢盒，新增帳戶時可自動將 `initial_balance` 設為 0，或保留使用者輸入的初始金額（使用者投入零錢盒的第一筆錢）。

### 3.3 零錢盒 CRUD API 流程

```
CREATE:  POST /rest/v1/finance_accounts
  Body: { user_id, display_name, account_type: "cash", initial_balance, is_coin_box: true, ... }
  → DB check constraint 驗證 account_type = 'cash' 且無 credit/loan 欄位
  → RLS 驗證 user_id = auth.uid()

READ:   GET /rest/v1/finance_accounts?select=*,is_coin_box
  → 現有 `loadAccounts()` 已 select 全部欄位，新增 is_coin_box 後自動取得

UPDATE: PATCH /rest/v1/finance_accounts?id=eq.{id}
  Body: { is_coin_box: true/false }
  → DB check constraint 驗證
  → 若從 true 改 false：需清除 credit/loan 欄位或放行（原已是 NULL）

DELETE: 透過現有 toggle is_active 機制，不真正刪除
```

**無需新增 Edge Function**，直接使用 Supabase REST API。

---

## 4. UI 設計

### 4.1 `initial_balance` — 現有 UI 強化

**現狀**：`AccountsTab.tsx` 已有 initial_balance 輸入（第 403-408、309-312 行）與顯示（第 335 行），完全滿足功能需求。

**強化建議（非必選但推薦）：**
- 輸入框加上前綴「TWD」或貨幣符號
- placeholder 從「例：0」改為更明確的「例如：100000」
- 新增帳戶時預設值保持 0（不變）

### 4.2 Coin Box Toggle — 全新 UI 元素

**新增表單（`handleAdd` 區域）：**
在「初始餘額」下方、條件欄位（renderConditionalFields）之前插入：

```
[帳戶類型: cash ▼]
[初始餘額: __________]

┌─ 零錢盒 ─────────────────┐
│ [Toggle] 啟用零錢盒模式     │
│                           │
│ 零錢盒是 reminder-based    │
│ 儲蓄，不自動影響帳戶餘額。  │
│ 年末會提醒你結算轉帳。      │
└───────────────────────────┘
```

**Toggle 行為規則：**
- 僅在 `account_type === 'cash'` 時顯示
- 切換後：
  - `is_coin_box = true`：清除 credit_limit / billing_day / total_loan / loan_term_months / interest_rate（若之前有值）
  - 帳戶列表卡片顯示 🪙 圖標
- 新增表單與編輯表單共用此邏輯

**編輯表單（`startEdit` → `handleUpdate`）：**
- 讀取 `acct.is_coin_box` 初始化 toggle
- 切換 `account_type` 從 cash 到非 cash 時：自動關閉 toggle 並提示
- 切換 `account_type` 到 cash 時：恢復 toggle 顯示

### 4.3 帳戶列表行新增

在 `renderAccountRow` 的顯示區塊新增：

```typescript
// 在 account_type badge 旁邊
{acct.is_coin_box && <span className="coin-badge">🪙 零錢盒</span>}
```

### 4.4 年末轉帳提醒按鈕

在帳戶列表行中，當 `is_coin_box === true` 時顯示：

```
[🪙 零錢盒 · 餘額 TWD 5,000]
[📤 年末結算] [編輯] [停用]
```

**按鈕行為（P1 功能，本次僅設計）：**
- 點擊後開啟一個對話框
- 顯示目前零錢盒餘額
- 建議轉帳到指定銀行帳戶
- 點擊確認後，建立一筆 `transfer` 類型的 `finance_activity` 記錄
- 從零錢盒（現金帳戶）轉出到目標銀行帳戶

**實作時機**：在 P0 #1 中先放按鈕但顯示「coming soon」，或直接完成。

### 4.5 行動優先排版建議

| 元件 | 建議 |
|------|------|
| Toggle 開關 | 最小觸控面積 44×44px，iOS 風格 toggle |
| 表單欄位 | 單行 label + input 垂直排列（非並排） |
| 按鈕 | 最小高度 44px，左右 padding 16px |
| Toast 提示 | 固定在頂部，3 秒自動消失 |
| 帳戶列表行 | 資訊區 + 操作區並排，操作按鈕用圖標優先 |
| 零錢盒 badge | 明顯醒目，綠色或金色標示 |

---

## 5. Dashboard 影響分析

### 5.1 零錢盒餘額顯示

**現狀**：`useDashboard.ts` 第 248 行計算：

```typescript
balance: Number(a.initial_balance ?? 0) + (incomeMap.get(a.id) ?? 0) - (expenseMap.get(a.id) ?? 0),
```

**零錢盒餘額** 已自動包含在此計算中，因為：
- 零錢盒是 `account_type === 'cash'` 的 `finance_accounts` 記錄
- 所有帳戶的活動（income/expense）都透過 `account_id` 關聯
- 即使零錢盒是 reminder-based，實際記帳時使用者仍會選擇零錢盒作為 account

### 5.2 Dashboard 區分建議

**在 `AccountSummary` type 增加 `isCoinBox` 欄位：**

```typescript
export type AccountSummary = {
  // ... existing fields
  isCoinBox: boolean;  // 新增
};
```

**在帳戶總覽元件中：**
- 零錢盒帳戶顯示 🪙 圖標
- 可選擇在總餘額中將零錢盒餘額獨立顯示一行：「零錢盒：TWD 5,000」
- 預設：合併計算總餘額（`totalBalance` 不變），視覺上標示

### 5.3 是否需要修改 `useDashboard.ts`

**最低修改量（推薦）：**
- 在 `supabase.from("finance_accounts").select(...)` 補上 `is_coin_box` 欄位
- 在 `AccountSummary` mapping 中補上 `isCoinBox: a.is_coin_box`
- 其餘計算邏輯不變

**總計約 3 行修改**。

---

## 6. 風險與邊界案例

### 6.1 把既有帳戶改成 coin box

| 情境 | 風險 | 處理方式 |
|------|------|---------|
| 既有銀行帳戶 → coin box | 違反 check constraint (account_type ≠ 'cash') | DB 層直接拒絕，前端 toast 提示 |
| 既有現金帳戶 → coin box | 若 credit/loan 有值則違反 constraint | 前端自動清空 credit/loan 欄位，或提示使用者先清除 |
| 既有現金帳戶 → coin box（全 NULL） | ✅ 無風險 | 直接允許 |

### 6.2 關閉 coin box

| 情境 | 行為 |
|------|------|
| `is_coin_box: false`（原先已是 cash） | ✅ 無風險，保留所有活動記錄 |
| `is_coin_box: false` + 切換到非 cash 類型 | 前端需先關閉 coin box 再切換類型 |
| 關閉後重新開啟 | initial_balance 保留、活動記錄保留，零錢盒餘額一致 |

### 6.3 零錢盒餘額 vs 實際現金餘額

**核心問題**：零錢盒是 reminder-based，使用者可能：
1. 把實際現金放入實體零錢盒，但記帳時忘了選零錢盒 account
2. 把實際現金從零錢盒取出使用，但記帳時忘了記錄

**緩解策略**：
- 在 quick-capture 記帳時，如果使用者選了零錢盒現金帳戶，自動提示「這是零錢盒帳戶」
- 年末結算時，比對零錢盒的 `initial_balance + income - expense` 與使用者的實際盤點金額
- 提供「調整零錢盒餘額」功能（建立一筆 adjustment 類型的 activity）

### 6.4 Staging only 的影響

無 production 意味著 migration 可以直接在 staging 資料庫執行，不需 rollback 方案。但仍有以下建議：
- migration 使用 `if not exists` / `if exists` 確保冪等性
- 為保持 migration 歷史整潔，建議 migration 檔案標題清晰

---

## 7. 與現有功能的互動

### 7.1 quick-capture（快捷記帳）

**現狀**：quick-capture 讓使用者選擇 account 進行收入/支出記帳。

**零錢盒影響**：
- 零錢盒帳戶會出現在 account 下拉選單中（因為 `is_active = true`）
- 選擇零錢盒記帳時：正常建立 income/expense 記錄
- 建議在 account 選項中標示 `🪙 零錢盒` 讓使用者知道這是零錢盒
- 零錢盒的餘額變動自動反映在 Dashboard

### 7.2 Telegram 語音記帳

**現狀**：`ai-log-finance-activity` Edge Function 透過 AI 解析自然語言，選擇帳戶。

**零錢盒影響**：
- 使用者在 Telegram 說「存 500 到零錢盒」→ AI 應解析為：
  - movement_type: "income"
  - account: 零錢盒帳戶（透過 `ai-get-user-refs` 查詢零錢盒 ID）
- 使用者在 Telegram 說「從零錢盒拿 200 買飲料」→ AI 應解析為：
  - movement_type: "expense"
  - account: 零錢盒帳戶
- **需更新 `ai-get-user-refs`**：在回傳帳戶對照表時，標記哪些是零錢盒
- 無需修改 Edge Function 邏輯，只需在 reference 資料中增加 `is_coin_box` 標記

### 7.3 budgets（預算）

**零錢盒影響**：
- 零錢盒是帳戶層級的功能，預算（budgets）是分類層級的功能
- 兩個功能**正交**：預算綁定 `category_id`，零錢盒綁定 `account_id`
- 使用者可以為零錢盒相關的分類（如「零錢儲蓄」）設定預算
- 無需修改 budgets 相關 migration 或 UI

### 7.4 subscriptions（訂閱）

`finance_subscriptions` 表（存在於 staging 但未在 CLAUDE.md 列出）與零錢盒無關。零錢盒不影響訂閱功能。

---

## 總結：實作範圍

| 項目 | 範圍 | 估計工作量 |
|------|------|-----------|
| Migration 1 個 | `20260531000001_add_coin_box_field.sql` | 小 |
| AccountsTab UI：coin box toggle | 新增表單 + 編輯表單 + 列表 badge | 中 |
| AccountsTab UI：initial_balance 強化 | placeholder / 顯示優化 | 極小 |
| Dashboard：AccountSummary 加 isCoinBox | 修改 3 行 | 極小 |
| Dashboard：帳戶總覽零錢盒標示 | 前端元件修改 | 小 |
| 年末結算按鈕（P1） | 對話框 + transfer 流程 | 中（延至 P1） |
| Telegram refs 更新 | `ai-get-user-refs` 增加 is_coin_box | 極小 |

**總計約 4-6 小時實作時間**（不含年底結算按鈕）。
