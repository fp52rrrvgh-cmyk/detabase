# P0-3: 每日花費 vs 每日限額 Design Spec

**任務 ID**: t_1c51da58
**狀態**: 設計階段（Architect）
**對應產出**: ① Design spec（本文件）→ ② Migration + RLS + GRANT → ③ Frontend Dashboard 元件

---

## 1. 需求摘要

在 Dashboard 頂部顯示**今日支出總額 vs 每日限額**，大字、顏色進度條警示。小新開車時快速看一眼就知道今天花多少。

### 使用情境
- 開車休息時單手拿手機，瞄一眼就知道今天花費狀態
- 大字、兩個數字（花費 vs 限額）、顏色直覺（綠/黃/紅）
- 每日限額預設自動計算（月預算總和 ÷ 當月天數），也允許手動設定
- 不是月預算的替代，是日維度補充

### 全域限制
- **不修改現有 `finance_budgets` 結構**
- Mobile-first，單手操作
- 今日支出資料從 `useDashboard` 的 `todayExpense` 欄位取得（已存在）

---

## 2. 資料模型

### 新增表: `finance_daily_spending_limits`

**語意**：此表只儲存「使用者自訂每日限額」。不存在此表的 user 使用自動推導值。

```sql
create table if not exists public.finance_daily_spending_limits (
  user_id              uuid not null primary key default auth.uid(),
  -- 自訂每日限額（TWD 分，正整數）
  daily_limit_amount   bigint not null check (daily_limit_amount > 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
```

- `user_id` 為 PK，確保每人一筆（無獨立 id 欄位）
- 只存在已手動設定的 user。沒有 row = 使用自動推算
- 沒有 `is_auto` 欄位 — auto 值不持久化，避免語意矛盾

### RLS 策略

```sql
alter table public.finance_daily_spending_limits enable row level security;

create policy "Users can view own daily limit"
  on public.finance_daily_spending_limits for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily limit"
  on public.finance_daily_spending_limits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily limit"
  on public.finance_daily_spending_limits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own daily limit"
  on public.finance_daily_spending_limits for delete
  using (auth.uid() = user_id);
```

- 新增 DELETE policy（「恢復自動估算」= 刪除自己的 row）
- 寫入方式：Supabase client（PostgREST）+ RLS，不新增 Edge Function

### 自動推算邏輯

當 `finance_daily_spending_limits` 查無該使用者資料時：

```
auto_daily_limit = total_monthly_budget / days_in_month
```

其中 `total_monthly_budget = SUM(finance_budgets.limit_amount WHERE budget_year, budget_month)`，`days_in_month` 是當月天數。

**auto 值不持久化**：月預算每月不同，auto 值是瞬時計算值。若使用者自訂限額後想恢復自動推算，效果是刪除該 row，下次讀取自動走 fallback。

---

## 3. Dashboard 資料流（useDashboard.ts 修改）

### DashboardSummary type 新增欄位

```typescript
export type DashboardSummary = {
  // ... 現有欄位 ...

  // P0-3: 每日花費 vs 每日限額
  dailyLimit: {
    amount: number;      // 每日限額值（有自訂→custom，無自訂→auto 推算，TWD 分）
    type: "custom" | "auto";  // 是否為自訂值
  };
};
```

**不新增 `dailyExpense`** — 沿用現有 `todayExpense` 欄位。同一語意不重複命名。

### 查詢邏輯

在 `useDashboard` 的平行查詢區塊新增：

```typescript
const dailyLimitPromise = supabase
  .from("finance_daily_spending_limits")
  .select("daily_limit_amount")
  .limit(1);  // RLS 確保只回傳自己的，每人一筆
```

在 setState 之前新增計算邏輯：

```typescript
// ===== P0-3: 每日限額計算 =====
const dailyLimitRow = (dailyLimitRows ?? [])[0] as any;
const daysInMonth = new Date(year, month, 0).getDate();
const totalMonthlyBudget = budgetList.reduce((s, b) => s + b.limitAmount, 0);
const autoDailyLimit = Math.round(totalMonthlyBudget / Math.max(daysInMonth, 1));

let dailyLimitAmount: number;
let type: "custom" | "auto";

if (dailyLimitRow) {
  // 使用者有自訂限額
  dailyLimitAmount = Number(dailyLimitRow.daily_limit_amount);
  type = "custom";
} else {
  // 回退到自動估算（不持久化）
  dailyLimitAmount = autoDailyLimit;
  type = "auto";
}
```

---

## 4. 寫入方式：Supabase PostgREST + RLS

**不新增 Edge Function**。Codex Audit 確認 `set-budget` 實際上是 caller-token PostgREST wrapper，而 `BudgetsTab` 已直接走 PostgREST 寫入。多一層 EF 不增加安全性。

### 寫入操作

| 操作 | 方法 | API |
|:-----|:-----|:----|
| 設定自訂限額 | POST `/rest/v1/finance_daily_spending_limits` (upsert with `user_id`) | Supabase client (JWT) |
| 恢復自動估算 | DELETE `/rest/v1/finance_daily_spending_limits?user_id=eq.<uid>` | Supabase client (JWT) |

### 寫入前驗證（前端）
- `daily_limit_amount`: 正整數，> 0，單位 TWD 分
- 輸入框限正整數

### 實作前注意事項
- 必須確認 `authenticated` role 已 GRANT table 的 SELECT / INSERT / UPDATE / DELETE 權限（比對 `finance_budgets` 的 grant migration pattern）
- RLS 已涵蓋 row-level 控制
- 參考檔案：`supabase/migrations/20260527081144_revoke_budget_grants_and_reapply.sql`

---

## 5. 前端 UI 設計

### 5.1 元件: `DailySpendingGauge`

**檔案位置**: `apps/web/app/dashboard/components/DailySpendingGauge.tsx`

**Props**:

```typescript
interface DailySpendingGaugeProps {
  spent: number;         // todayExpense
  limit: number;         // dailyLimit.amount
  type: "custom" | "auto";  // 自訂 or 自動估算
  onSetLimit: (amount: number) => Promise<void>;  // 設定自訂限額（upsert）
  onResetToAuto: () => Promise<void>;             // 恢復自動估算（DELETE row）
}
```

### 5.2 視覺設計（Mobile-first，單欄）

版面配置 — 放置於 Dashboard **最頂端**（Header 下方、Briefing 上方），讓小新一打開就看到。

**顏色邏輯**：
- `spent/limit < 60%` → 綠色（安全）
- `60% ≤ spent/limit < 85%` → 黃色（注意）
- `85% ≤ spent/limit ≤ 100%` → 紅色（警戒）
- `spent/limit > 100%` → 紅色 + 閃爍/跳動動畫（超支）

```
┌────────────────────────────────────┐
│  📅 今日花費            剩 TWD 1,720│
│                                    │
│       TWD 1,280                    │  ← 巨大數字（~2.5rem, bold, monospace）
│                                    │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░  42%     │  ← 進度條，顏色隨比率變化
│                                    │
│  每日限額  TWD 3,000  🔧自訂       │  ← 🔧 自訂 / 自動估算，點擊可修改
└────────────────────────────────────┘
```

**編號說明**：
1. **Header 列**：`📅 今日花費`（左）+ `剩 TWD X,XXX`（右，剩餘正數顯示，負數顯示「超支 TWD X,XXX」紅色）
2. **主數字**：今日支出總額，巨大字型（`font-size: 2.5rem`），顏色跟隨警戒等級
3. **進度條**：填滿色隨 `spent/limit` 變化
4. **底部列**：左側標示「每日限額」，右側顯示金額，附帶狀態徽章（`⚡自動` 或 `⚙️手動` — 點擊可修改）

### 5.3 UX 互動

| 動作 | 行為 |
|------|------|
| 點擊限額金額或 🔧 圖示 | 開啟 modal，輸入 TWD 整數值，確認後 UPSERT |
| 恢復自動估算 | 點「恢復自動估算」按鈕 → DELETE 該 user 的 row → 下次讀取自動走 fallback |
| 首次使用（無資料） | 顯示自動估算值，標記 `依月預算自動估算` |
| 超支（>100%） | 超支部分以紅色文字顯示 `+ TWD X,XXX` |

### 5.4 設定路徑

由於此元件在 Dashboard 頂部即可點擊修改限額，不需另開設定頁。Settings 頁修改為 P1（暫不做）。

---

## 6. 修改檔案清單

| 檔案 | 修改類型 | 說明 |
|------|---------|------|
| `supabase/migrations/20260531000001_create_daily_spending_limits.sql` | **新增** | 建表 + RLS（SELECT/INSERT/UPDATE/DELETE）+ GRANT authenticated |
| `apps/web/app/dashboard/components/DailySpendingGauge.tsx` | **新增** | 每日花費 vs 限額 儀表元件 |
| `apps/web/app/dashboard/hooks/useDashboard.ts` | **修改** | DashboardSummary type 新增 dailyLimit 欄位 + 查詢邏輯 + auto fallback |
| `apps/web/app/dashboard/page.tsx` | **修改** | 在 Header 與 Briefing 之間插入 `<DailySpendingGauge>` |
| `apps/web/app/dashboard/components/DashboardSkeleton.tsx` | **修改** | 在 Header skeleton 與 Briefing skeleton 之間插入 daily limit skeleton |
| `apps/web/app/globals.css` | **修改** | 新增 `.daily-gauge-*` CSS class |

**本次不新增**
- ❌ `supabase/functions/set-daily-limit/index.ts` — Edge Function 不需要
- ❌ Settings 頁修改 — P1
- ❌ `dailyExpense` 欄位 — 語意不重複

---

## 7. Skeleton 載入狀態

在 `DashboardSkeleton.tsx` 的 Header skeleton 之後、Briefing skeleton 之前插入：

```tsx
{/* Daily spending gauge skeleton */}
<div className="daily-gauge-skel">
  <div className="skel skel-text" style={{ width: 120, height: 14, marginBottom: 8 }} />
  <div className="skel skel-title" style={{ width: 200, height: 44, marginBottom: 12 }} />
  <div className="skel skel-box" style={{ width: "100%", height: 16, borderRadius: 8, marginBottom: 8 }} />
  <div className="skel skel-text" style={{ width: 160, height: 14 }} />
</div>
```

---

## 8. 邊界案例與錯誤處理

| 情境 | 行為 |
|------|------|
| 無預算設定（budgetList 空） | auto_daily_limit = 0，顯示「⚠️ 請先設定月預算以取得每日限額」，進度條隱藏 |
| 無每日限額記錄 + 無預算 | 顯示「⚠️ 請設定每日限額」，`limit` = 0，不顯示進度條 |
| `todayExpense = 0` | 主數字 `TWD 0`，進度條 0%，綠色 |
| 限額 = 0（錯誤狀態） | 不顯示進度條，顯示提示文字請使用者設定 |
| 自訂限額小於今日花費 | 正常顯示紅字，不擋（允許使用者設低限額自己警醒） |
| UPSERT API 失敗（403/500） | toast 錯誤訊息，不影響 Dashboard 其他資料顯示 |
| DELETE 恢復自動估算失敗 | toast 錯誤訊息，不影響 Dashboard |

---

## 9. 風險與 Trade-off

| 風險 | 影響 | 緩解 |
|------|------|------|
| 自訂限額後月預算變更不自動同步 | 使用者調高月預算但自訂日限額不變 → 日限額相對變緊 | Dashboard 標示 🔧自訂 / 依月預算自動估算 提醒 |
| 自動估算：`月預算總和 / 天數` 對平日/假日不區分 | 可能不準確（週末花費較高） | 日限額是「平均參考」，不是嚴格管制，P2 可考慮加入假日加權 |
| 新表需要 GRANT authenticated 才能寫入 | 未 GRANT 前 PostgREST 寫入會回 401 | 實作時必須補 grant migration（參照 budget grant pattern）|
| DELETE policy 新增 | 「恢復自動估算」操作需要 DELETE RLS policy | Spec 已含 DELETE policy，實作確認 

### 替代方案（不採用的理由）

1. **複用 `finance_budgets` 新增 `is_daily` 旗標**：不採用，因為違反「不修改現有 finance_budgets 結構」的約束
2. **把每日限額存進 user metadata**：不採用，因為 user metadata 不是 financial data 的合理儲存層，且不易做 RLS 和索引
3. **只用前端計算，不存表**：不採用，因為「手動設定值」需要持久化，否則每次重新登入就遺失
4. **每月的每日限額（按月維度）**：不採用，因為日限額是個人習慣常數，不隨月份變化，不需要 monthly partition

---

## 10. 相依與順序

1. **第一步**：此 spec 審查完成後 → Migration (`finance_daily_spending_limits` + RLS + GRANT)
2. **第二步**：Frontend 修改（順序：useDashboard.ts → DailySpendingGauge.tsx → page.tsx → globals.css → DashboardSkeleton.tsx）
3. **第三步**：`npm run build` 驗證通過後合併

**本次不做**
- Edge Function (`set-daily-limit`)
- Settings 頁修改
- AI 建議
- 假日加權
- debt / transfer 模組

---

## 11. 驗收標準

- [ ] `finance_daily_spending_limits` 表建立（user_id PK, daily_limit_amount, created_at, updated_at）
- [ ] RLS 含 SELECT / INSERT / UPDATE / DELETE 四種 policy
- [ ] authenticated role GRANT migration 已補
- [ ] `DashboardSummary` type 新增 `dailyLimit: { amount: number; type: "custom" | "auto" }`
- [ ] 不新增 `dailyExpense` — 沿用 `todayExpense`
- [ ] `useDashboard.ts` 正確查詢 daily limit 並回退到 auto fallback
- [ ] `DailySpendingGauge.tsx` 存在於 `components/` 目錄
- [ ] 今日支出顯示巨大字型 (`font-size: ~2.5rem`)
- [ ] 進度條顏色正確（<60% 綠, 60-85% 黃, 85-100% 紅, >100% 紅+閃爍）
- [ ] Header 顯示剩餘/超支金額
- [ ] 底部顯示「每日限額」+ 🔧自訂 / 依月預算自動估算
- [ ] 可點擊限額數字開啟設定 modal → UPSERT table
- [ ] 「恢復自動估算」按鈕 → DELETE row
- [ ] 無預算時顯示提示訊息，非崩潰
- [ ] Skeleton 載入狀態正確
- [ ] `npm run build` 通過
- [ ] 不新增 Edge Function
- [ ] 不修改 Settings 頁
