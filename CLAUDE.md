# CLAUDE.md — 個人作戰系統主配置

**本文件是唯一真相來源。所有狀態、決策、禁止事項直接維護於此，不依賴外部 docs/。**

## 系統定位
Personal Financial Operating System（個人財務作戰系統）
不是記帳 App，是長期決策增強系統。

## 使用者背景
- 26 噸大貨車司機（單人自用，不考慮多人協作）
- 車輛：2022 DAF CF480
- 主控台：iPhone 15 Pro Max
- 使用場景：車上、夜車、搬貨現場、疲勞狀態、單手操作
- 核心需求：超低操作步數、行動優先、可中斷接續、高容錯

## 技術棧
- Backend: Supabase (PostgreSQL + Edge Functions + RLS)
- Frontend: Next.js 16 App Router + TypeScript + React 19
- 入口: WebApp PWA（`apps/web`）
- Staging 專案: `detabase-staging`，無 production

## 核心原則
1. Supabase = Truth Layer，但**小馬可直接透過 API/Edge Function 寫入**（使用者授權）
2. AI 可以做分析、建議、**經使用者授權後可直接執行**
3. Staging only，無 production
4. 本文件自給自足，不依賴 docs/ 任何文件

## 關鍵路徑
```
apps/web/app/page.tsx              ← 入口頁面（55 行，邏輯已拆至 hooks/）
apps/web/app/layout.tsx            ← App layout
apps/web/app/globals.css           ← 全域樣式
apps/web/.env.local                ← env 值（本地唯一，禁止 commit）
supabase/migrations/               ← 所有 migration（需專屬 issue 才能動）
scripts/local/manual-log.js        ← 本地手動記錄腳本
scripts/local/setup-references.js  ← 本地 ref 設定腳本
```

## Schema（detabase-staging）
| 表 | 用途 |
|----|------|
| `finance_accounts` | 帳戶（user_id, display_name, account_type (cash/bank/credit_card/stored_value/digital_account/other), is_active） |
| `finance_categories` | 分類（user_id, display_name, grouping_purpose, is_active） |
| `finance_activities` | 主要財務記錄（movement_type, amount > 0, currency = TWD） |
| `finance_activity_corrections` | 作廢稽核（correction_type = 'void'，原始紀錄不刪） |
| `finance_budgets` | 預算（user_id, category_id, budget_year, budget_month, limit_amount） |
| `finance_budget_alerts` | view：預算警報（ok/warning/exceeded） |
| `finance_monthly_summary` | materialized view：每月摘要 |

RLS：全表啟用，`user_id = auth.uid()`。service_role 已 GRANT 給部分表供 Edge Function 使用。

## Migrations（20 檔）
```bash
supabase/migrations/
├── 20260518015307_create_finance_mvp_schema.sql
├── 20260521023657_create_finance_activity_corrections.sql
├── 20260521041547_create_finance_activity_void_rpc.sql
├── 20260527000001_perf_schema_constraints_indexes.sql
├── 20260527000002_add_category_breakdown_rpc.sql
├── 20260527000003_create_budgets.sql
├── 20260527000004_fix_budget_alerts_security.sql
├── 20260527000005_grant_budget_alerts.sql
├── 20260527000006_grant_budget_table_select.sql
├── 20260527000007_grant_budget_table_insert_update.sql
├── 20260527000008_grant_category_dml.sql
├── 20260527005900_grant_service_role_select_reference.sql
├── 20260527084116_grant_service_role_finance_activities.sql
├── 20260527120000_grant_budget_table_delete.sql          ← 補 DELETE GRANT
├── 20260527150000_fix_budget_category_fk_composite.sql    ← 修複合 FK
├── 20260527160000_grant_activity_table_dml.sql            ← 補 activities GRANT
├── 20260529000001_add_digital_account_type.sql           ← 新增 digital_account 類型
├── 20260531000002_create_daily_spending_limits.sql
└── 20260531000003_add_coin_box_field.sql                 ← 新增 coin_box 欄位
```

## Edge Functions（detabase-staging）
- `log-finance-activity` — 新增 income / expense（前端，verify_jwt=true）
- `void-finance-activity` — 作廢 expense（前端，verify_jwt=true）
- `set-budget` — 設定預算（前端，verify_jwt=true）
- `ai-search-finance-transactions` — AI 交易搜尋（內部，verify_jwt=false，HMAC auth）
- `ai-log-finance-activity` — AI 語音記帳（內部，verify_jwt=false，HMAC auth）
- `ai-get-user-refs` — AI 查詢分類/帳戶對照（內部，verify_jwt=false，HMAC auth）
- `test-env` — 環境驗證（內部，verify_jwt=false，HMAC auth，不回傳 key 值）

## 環境變數名稱（值永遠留在 apps/web/.env.local，禁止記錄值）
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_FINANCE_FUNCTION_URL
NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID
NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID
NEXT_PUBLIC_DEFAULT_INCOME_ACCOUNT_ID
NEXT_PUBLIC_DEFAULT_INCOME_CATEGORY_ID
```

## Dev 啟動
```bash
cd apps/web
npm install
npm run build   # 只有 build，無 dev server script
```

## 當前已實作功能
- Dashboard 戰情總覽：本月收支、KPI、趨勢圖、分類餅圖、帳戶餘額、預算進度、最近交易
- 快捷記帳（quick-capture）：手動收入/支出輸入
- 分類管理（categories）：增刪改分類
- 預算設定（budgets）：每月分類預算設定 + 超支警報
- Telegram 語音記帳：自然語言一鍵入帳（小馬 Edge Function）
- Telegram 交易搜尋：自然語言查詢
- 作廢修正（expense only）+ 作廢稽核紀錄

## 當前優先
1. **語音/快捷記帳** — Telegram 自然語言一鍵入帳（小馬直接寫入）
2. **交易搜尋** — Telegram 自然語言查詢＋Dashboard 搜尋頁
3. **自動分類規則引擎** — 關鍵字自動帶入分類/帳戶
4. 其餘功能依 roadmap 推進

## 工作流程規則
- Issue-first：每個功能有獨立 issue，明確定義邊界後才動手
- 每步獨立 PR，合併後在 staging 瀏覽器實際驗證
- Schema / migration / Supabase config 必須有專屬 issue 才能動
- Staging 驗證：不記錄任何 UUID 值、runtime 值、token、session 值

## 對話偏好
- 繁體中文
- 直接給結論和 code
- 深色未來感戰情中心風格

## 硬性禁止（違反即停）
- 不在 repo 任何地方記錄 env 值、UUID 值、token、session 值
- 不宣告 production-ready
- `apps/web/.env.local` 禁止 commit
