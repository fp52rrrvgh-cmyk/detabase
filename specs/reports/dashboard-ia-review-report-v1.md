# Dashboard IA Review — 審查報告 v1

**狀態**: 小馬提案 + Codex 審查 → ✅ 共識 → ⏸️ 等小新驗收

---

## 發現 1：IA 順序不符合戰情需求

當前順序：Header → Gauge → Briefing → Snapshot → KPI → 圖表 → 帳戶 → 交易 → 預算 → YoY → Footer

問題：今日最重要的「今天還能花多少、即時風險」沒有集中在首屏。Briefing 打斷數字掃讀。

改善建議：Today War Room（Gauge + 剩餘 + 風險）→ 財務狀態（Snapshot + KPI）→ 花費分析（圖表 + 交易）→ 決策支援（預算 + YoY）

---

## 發現 2：月份切換語義錯誤（Bug）

- page.tsx:467 — 歷史月份用今天的 dayOfMonth 算月平均 → **錯**
- page.tsx:479 — monthEnd 取今天所在月份，非 viewMonth → **錯**
- page.tsx:494 — 日均支出用今天日期當分母 → **錯**
- useDashboard.ts:296 — 歷史月份 todayExpense 設 0，Gauge 顯示「本月每日花費 0」→ **誤導**

---

## 發現 3：Footer 摘要與首屏重複

「今日支出」與 DailySpendingGauge 重疊。「本月剩餘天數」是決策資訊但放頁底。

---

## 發現 4：DailySpendingGauge 歷史月份顯示 0

Gauge 永遠顯示 todayExpense。 hook 在非本月設為 0。切到歷史月份 Gauge 標「本月每日花費」但數值是 0。

---

## 發現 5：「本週收入」文案錯誤

page.tsx:490 寫「本週收入」，實際 value 是 thisMonthIncome。文案跟資料不一致。

---

## 發現 6：歷史月份「最近交易」不是該月份

useDashboard.ts:190 的 recentPromise 沒有用 monthStart/monthEnd 過濾。切到歷史月份仍顯示全域最近 10 筆。

---

## 發現 7：歷史月份仍顯示 current-state 資訊

帳戶餘額、訂閱等資料不受 viewMonth 影響。切到歷史月份時這些數字跟當前月份一樣，會誤導。

---

## 結論

| 項目 | 結果 |
|:-----|:-----|
| IA 可做 MVP 重構 | ✅ 是，範圍已限縮 |
| 有明確 bug 需修 | ✅ 發現 2、4、5、6、7 |
| 風險等級 | 🟡 MED（不是 LOW — 月份語義有多處 bug）|
| 建議優先級 | 先修月份語義 bug → 再重排 IA |

---

**小新，審查報告在這裡了。7 項發現，我建議先修月份語義的 bug 再重排 IA。請驗收。**
