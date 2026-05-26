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
1. Supabase = Truth Layer，AI 不直接修改資料
2. AI 只做分析建議，使用者拍板
3. Staging only，無 production
4. 本文件自給自足，不依賴 docs/ 任何文件

## 關鍵路徑
```
apps/web/app/page.tsx              ← 唯一前端頁面（2271 行巨型元件，技術債）
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
| `finance_accounts` | 帳戶（user_id, display_name, account_type, is_active） |
| `finance_categories` | 分類（user_id, display_name, grouping_purpose, is_active） |
| `finance_activities` | 主要財務記錄（movement_type, amount > 0, currency = TWD） |
| `finance_activity_corrections` | 作廢稽核（correction_type = 'void'，原始紀錄不刪） |

RLS：全表啟用，`user_id = auth.uid()`，publishable key only，無 service_role。

## Edge Functions（detabase-staging）
- `log-finance-activity` — 新增 income / expense
- `void-finance-activity` — 作廢 expense（呼叫 `void_finance_activity` RPC）

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
全部在 `apps/web/app/page.tsx` 這一個 2271 行的巨型元件裡：

- Staging 登入/登出（email + password，Supabase Auth）
- 執行環境狀態顯示（env 名稱 + configured/missing，不顯示值）
- 快速輸入：支出 / 收入切換，整數 TWD，自動帶今日日期
- 唯讀財務檢視：日期區間 + 收支類型篩選，最多顯示 25 筆
- 合計：所選範圍、依收支類型、依分類、依帳戶
- 作廢修正（expense only）+ 作廢稽核紀錄（可切換顯示）
- Dashboard card strip：今日/本月/近 7 日支出、本月最大分類、Top 5 分類

**這是屎山。下一步是 refactor + Dashboard 重建，不是繼續往這個元件堆功能。**

## 當前優先
1. **Refactor** — 拆分 apps/web/app/page.tsx 巨型元件
2. **Dashboard 重建** — 結構化 Dashboard 頁面
3. **PWA 設定**

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
- 不碰生產 DB，不用 `service_role` key
- 不在 repo 任何地方記錄 env 值、UUID 值、token、session 值
- 不在非專屬 issue 外修改 schema / migration / Supabase config
- 不宣告 production-ready
- 不加 AI / Projection 行為（未獲明確核准前）
- 不加 seed 檔、報表 objects、版本號
- `apps/web/.env.local` 禁止 commit
- 不要繼續往 page.tsx 堆功能（refactor 前）
