# Detabase Dashboard 戰略級重構設計方案

## 背景

使用者是 26 噸貨車司機（單人自用）。個人作戰系統包含：記帳（Supabase `finance_activities`） + 車趟（Supabase `trips`/`freight`）。現有 Dashboard 有 15 個區塊，過於複雜不適合司機使用場景。需要精簡 + 新增車趟區塊 + 長期可用（50年設計年限）。

## 現有 Dashboard 區塊（15個）

1. Header（月份導航）
2. Daily Spending Gauge（每日花費限制）
3. Briefing（戰報摘要）
4. SnapshotDashboard（資產負債快照）
5. KPI Row（5卡：支出/收入/淨流量/總預算/帳戶總餘額）
6. AccountOverviewCard（帳戶卡片）
7. 債務追蹤連結
8. 花費分析區（DailyTrendChart + ExpensePieChart 並排）
9. 最近交易（6筆）
10. 決策支援區（BudgetBarChart）
11. 即將扣款（subscriptions，桌面版）
12. 月底預測（prediction panel）
13. 桌面區：近6月趨勢 + 去年同期比較
14. QuickCapture FAB（快捷記帳按鈕）
15. ShareReport（分享按鈕）

## 目標設計

### 移除（不適合司機場景）

| 區塊 | 原因 |
|------|------|
| Daily Spending Gauge | 每日花費限制 — 司機收入不固定，沒意義 |
| SnapshotDashboard | 資產負債太複雜 — 現金+信用卡卡號都顯示 |
| 債務追蹤連結 | 連到 `/debts` 不存在的頁面 |
| 即將扣款 | 固定訂閱 — 司機沒有 |
| 月底預測 | 司機收入/支出不規律，預測失準 |
| 近6月趨勢（桌面） | 數據不夠，且司機不看桌面版 |
| 去年同期比較（桌面） | 同上，YoY對司機意義不大 |
| Briefing 戰報 | 文字摘要用處不大，KPI 已足夠 |

### 保留 + 優化

| 區塊 | 優化 |
|------|------|
| KPI Row | 改為4卡：本月支出 / 本月收入 / 車趟油資 / 淨額 |
| AccountOverviewCard | 保留，精簡為只顯示餘額 |
| 分類支出餅圖 | 保留 |
| 預算進度條 | 保留，移到花費分析區下方 |
| 最近交易 | 保留，增加車趟顯示 |
| QuickCapture FAB | 保留 |

### 新增

| 區塊 | 內容 |
|------|------|
| 🚛 車趟摘要卡片 | 本月趟數 / 總油資 / 主要客戶 / 快速查詢連結 |
| 車趟列表（交易區下方） | 本月車趟簡表：日期、客戶、起點→抵達 |

### 整體排版（移動優先）

```
┌─────────────────────┐
│ 📅 2026年6月 [‹本月›] │
├─────────────────────┤
│ KPI Row（4卡2x2）    │
│ 支出 │ 收入          │
│ 車趟油資 │ 淨額      │
├─────────────────────┤
│ 🚛 車趟摘要          │
│ 本月 4趟 油資$0      │
├─────────────────────┤
│ 💳 帳戶總覽          │
│ 現金 $X / 信用卡 -$Y │
├─────────────────────┤
│ 📊 分類支出比例      │
│ 餅圖                │
├─────────────────────┤
│ 📊 預算進度          │
│ 各分類進度條         │
├─────────────────────┤
│ 📝 最近交易（含車趟） │
│ 支出/收入/車趟 混合  │
├─────────────────────┤
│ [+] FAB 快捷記帳     │
└─────────────────────┘
```

## 技術實作

### useDashboard.ts 變更

1. 新增 `useTripSummary()` 或擴充現有 hook
2. 查詢 `trips` 表：`SELECT COUNT(*), COALESCE(SUM(fuel),0) FROM trips WHERE date LIKE '2026-06%'`
3. 新增 `tripCount`, `tripFuel`, `recentTrips` 到 state
4. 查詢 `freight` 表本月運費

### page.tsx 變更

1. 移除 8 個區塊（見上方移除清單）
2. 新增 TripsSummaryCard 組件
3. 修改 KPI Row 從 5 卡 → 4 卡
4. 重新排版順序

### Settings 頁面

移除 SubscriptionsTab、RulesTab。保留 AccountsTab、CategoriesTab、BudgetsTab。

### 50年 schema 考量

- `trips.client` TEXT — 客戶名可能變，但正常
- `trips.date` DATE — 支援跨年查詢
- `finance_activities` 已有完整 schema
- 不需變更資料庫結構

## 風險

- 移除 SnapshotDashboard 會影響現有帳戶顯示邏輯
- trips 查詢需要 RLS 授權（已確認有 GRANT）
- 前端刪除大量程式碼可能引入 import 錯誤

---

請 Codex 審查此設計方案。重點審查：
1. 移除的區塊是否有小新會需要的（我是否誤判）
2. 50年設計年限的 schema 是否有隱患
3. 排版是否合理
4. 有沒有遺漏的功能
