# Dashboard 月份語義收斂 — 圖紙

**狀態**: 小馬提案 → Codex 審查/修正 → ✅ 共識 → ⏸️ 等小新批准

---

## 目標

明確定義 Dashboard 每個資料區塊在月份切換時的行為，分為三種 scope。

## Scope 定義

| Scope | 行為 | 範例 |
|:------|:------|:------|
| **period-scoped** | 隨 viewYear/viewMonth 變動 | 收支、預算、趨勢圖 |
| **current-state** | 永遠顯示現在狀態 | 帳戶餘額、今日花費 |
| **forecast/upcoming** | 只在本月顯示或標為「未來 N 天」 | 月底推估、剩餘天數 |

## 各區塊分類

| 區塊 | Scope | 修改內容 |
|:-----|:------|:---------|
| DailySpendingGauge | current-state | 非本月隱藏，或改顯示「該月日均」 |
| Briefing | period + forecast | 收支隨月份；推估僅本月顯示 |
| SnapshotDashboard | current-state | monthlyNet 移到 KPI |
| KPI Row | 混合 | 收支預算=period；總餘額=current；UI 分組 |
| Trend/Pie Chart | period | 已正確，不動 |
| AccountOverview | current | 已正確，不動 |
| RecentTransactions | period | 已修完（加月份過濾） |
| BudgetBars | period | 已正確，不動 |
| YoY Chart | period | 已正確，不動 |
| Footer Summary | 混合 | 今日=current；剩餘天數=forecast；月均=period |

## 修改範圍

| 檔案 | 修改 |
|:-----|:------|
| page.tsx | Gauge 非本月行為、KPI UI 分組、Snapshot monthlyNet 移除、Footer 拆分 |
| useDashboard.ts | 無（已修完） |

## 不動

- ❌ schema/migration
- ❌ service/token/ACL
- ❌ 其他頁面

---

**小新，圖紙在這裡。請批准後開始施工。**
