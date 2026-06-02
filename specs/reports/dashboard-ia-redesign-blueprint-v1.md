# Dashboard IA 重排 — 圖紙 v1

**狀態**: 小馬提案 → Codex 審查/修正 → ✅ 共識 → ⏸️ 等小新批准

---

## 目標順序

```
1. Today War Room
   - 本月：DailySpendingGauge
   - 本月：今日風險摘要（Briefing 改定位）
   - 歷史月：該月概覽卡

2. 財務狀態
   - SnapshotDashboard
   - KPI Row（支出/收入/淨流量/總預算/總餘額）
   - AccountOverviewCard（從底部移上）

3. 花費分析
   - DailyTrendChart
   - ExpensePieChart
   - RecentTransactions

4. 決策支援
   - BudgetBarChart（從底部移上）
   - 本月限定：即將扣款
   - 本月限定：月底預測
   - YearOverYearChart
```

## 異動摘要

| 異動 | 說明 |
|:-----|:------|
| AccountOverviewCard | 從底部移到「財務狀態」區塊 |
| BudgetBarChart | 從底部移到「決策支援」首位 |
| Briefing | 改定位為「今日風險摘要」，短句不長文 |
| 區塊標題 | 每個區塊加 section title 分隔 |

## 不動

- ❌ 不改 schema/service/token
- ❌ 不改 QuickCapture（已移除）
- ❌ 不改登入流程

---

**小新，圖紙在這裡，批准後開始施工。**
