# P0-001 Implementation Report

## 1. 修改檔案清單

- `supabase/migrations/20260531000001_add_coin_box_field.sql`（新增）
- `apps/web/app/settings/AccountsTab.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/dashboard/hooks/useDashboard.ts`
- `apps/web/app/dashboard/components/AccountOverviewCard.tsx`
- `apps/web/app/dashboard/components/AccountOverview.tsx`
- `apps/web/app/hooks/useQuickCapture.ts`
- `apps/web/app/dashboard/components/QuickCaptureModal.tsx`
- `supabase/functions/ai-get-user-refs/index.ts`

## 2. 關鍵變更摘要

- Migration 新增 `finance_accounts.is_coin_box boolean not null default false`、cash-only constraint、no-credit/loan constraint、部分索引。
- AccountsTab 增加 `is_coin_box` 型別、select 欄位、新增/編輯 state、cash-only toggle、離開 cash 自動關閉、開啟 toggle 時清空 credit/loan state、列表 badge、新增與更新 payload。
- 初始餘額 placeholder 改為 `例如：100000`。
- Dashboard `AccountSummary` 增加 `isCoinBox`，帳戶查詢與 mapping 同步補上，帳戶概覽顯示 `🪙 零錢盒`。
- Quick-capture 帳戶查詢與 modal 帳戶選單補上 `is_coin_box` 標示。
- `ai-get-user-refs` 帳戶 refs 回傳 `is_coin_box`。

## 3. 關鍵程式碼片段

Migration:

```sql
alter table public.finance_accounts
  add column if not exists is_coin_box boolean not null default false;

alter table public.finance_accounts
  add constraint finance_accounts_coin_box_cash_only
    check (
      not is_coin_box
      or (is_coin_box = true and account_type = 'cash')
    );

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

Type 定義:

```ts
type AccountRow = {
  id: string;
  display_name: string;
  account_type: AccountType;
  initial_balance: number;
  credit_limit: number | null;
  billing_day: number | null;
  total_loan: number | null;
  loan_term_months: number | null;
  interest_rate: number | null;
  description: string | null;
  is_coin_box: boolean;
  is_active: boolean;
};

export type AccountSummary = {
  id: string;
  displayName: string;
  accountType: string;
  initialBalance: number;
  balance: number;
  creditLimit: number | null;
  totalLoan: number | null;
  currency: string;
  isCoinBox: boolean;
};
```

Toggle JSX:

```tsx
function renderCoinBoxToggle(prefix: "new" | "edit") {
  const enabled = prefix === "new" ? newIsCoinBox : editIsCoinBox;
  const onChange = prefix === "new" ? handleNewCoinBoxChange : handleEditCoinBoxChange;

  return (
    <div className="coin-box-toggle">
      <div className="coin-box-copy">
        <strong>🪙 零錢盒</strong>
        <span>提醒式儲蓄，不自動影響帳戶餘額；年末可提醒結算轉帳。</span>
      </div>
      <label className="coin-box-switch">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label="啟用零錢盒模式"
        />
        <span className="coin-box-slider" aria-hidden="true" />
        <span className="coin-box-switch-text">啟用</span>
      </label>
    </div>
  );
}
```

## 4. Build 結果

- `npm run build`：失敗。
- 錯誤訊息：

```text
> build
> next build

sh: 1: next: not found
```

- 補充檢查：`tsc --noEmit --project tsconfig.json` 也因本地沒有 `node_modules` 失敗，主要錯誤為找不到 `next/navigation`、`react`、`@supabase/supabase-js`、`react/jsx-runtime` 等套件型別。
- 未執行 `npm install`，因任務明確禁止。
- `git diff --check`：通過，沒有 whitespace error。

## 5. 驗收條件

- ✅ Migration 檔 `20260531000001_add_coin_box_field.sql` 已建立且含正確的 is_coin_box 欄位 + check constraints
- ✅ AccountsTab.tsx: AccountRow type 包含 `is_coin_box: boolean`
- ✅ AccountsTab.tsx: loadAccounts `.select()` 包含 `is_coin_box`
- ✅ AccountsTab.tsx: handleAdd body 在 toggle 開啟時包含 `is_coin_box: true`
- ✅ AccountsTab.tsx: handleUpdate body 包含 `is_coin_box`
- ✅ AccountsTab.tsx: 新增表單在 `account_type === 'cash'` 時顯示 toggle
- ✅ AccountsTab.tsx: 編輯表單正確讀取 `acct.is_coin_box` 初始化 toggle
- ✅ AccountsTab.tsx: 帳戶列表行顯示 🪙 badge（當 `is_coin_box = true`）
- ✅ AccountsTab.tsx: 切換 `account_type` 離開 cash 時自動關閉 toggle
- ✅ AccountsTab.tsx: toggle 開啟時自動清空 credit/loan 相關 state
- ✅ AccountsTab.tsx: `initial_balance` placeholder 改為「例如：100000」
- ✅ useDashboard.ts: AccountSummary type 包含 `isCoinBox: boolean`
- ✅ useDashboard.ts: `.select()` 包含 `is_coin_box`
- ✅ useDashboard.ts: mapping 包含 `isCoinBox: Boolean(a.is_coin_box)`
- ✅ Dashboard 帳戶總覽顯示 🪙 標示
- ✅ Quick-capture 帳戶選單標示 🪙
- ✅ ai-get-user-refs 回傳 `is_coin_box` 標記
- ❌ `npm run build` 通過，無 TypeScript 錯誤

## 6. 未滿足項目與建議修正

- 未滿足：`npm run build`。
- 原因：本地 `apps/web/node_modules` 不存在，`next` binary 不可用。
- 建議：在允許安裝依賴的環境執行 `npm ci`（或專案標準安裝命令）後重跑 `npm run build`。

## 7. 風險評估

- Migration constraint 會拒絕 `is_coin_box = true` 但 `account_type != 'cash'` 或仍帶 credit/loan 欄位的資料；前端已同步防守。
- 前端在 migration 尚未套用前查詢 `is_coin_box` 會失敗，因此需先在 Supabase 手動執行 migration 再部署/使用新前端。
- 本地無依賴導致無法完成真正 build 驗證；需要在安裝依賴後補跑一次。
