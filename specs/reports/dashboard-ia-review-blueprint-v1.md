# Dashboard IA Review — 圖紙（小馬 + Codex 共識版）

**狀態**: 小馬提案 → Codex 審查/修正 → ✅ 達成共識 → ⏸️ 等小新批准

---

## 審查目標

評估 Detabase Dashboard 資訊架構是否適合進行 MVP 重構，產出 IA 改善建議報告。

## 審查範圍（含 Codex 修正後）

| 項目 | 說明 |
|:-----|:------|
| page.tsx | 主頁面元件結構與渲染順序 |
| useDashboard.ts | 資料層查詢邏輯（尤其是月份語義） |
| globals.css | 行動版/桌機版 CSS 斷點與顯示規則（Codex 補） |
| components/ | 僅審 active 元件（主頁 import 路徑），標記未使用元件 |
| GAS gap analysis | 補對應 P0-2/P0-3 feature spec（Codex 補） |

## 審查重點（5 項）

1. **IA 戰情適配** — 是否符合 Today War Room → 財務狀態 → 花費分析 → 決策支援
2. **月份切換語義** — 切到歷史月份時今日上限/剩餘天數/訂閱是否誤算
3. **Mobile 首屏優先** — 最重要的決策資訊是否在最前面
4. **資產負債 Snapshot 層級** — 可用資金/債務/淨資產是否清楚
5. **2 週 MVP 範圍** — 限縮為 IA 重排 + 語義修正 + mobile 優先，不含新功能

## 產出

- IA 審查報告（specs/reports/dashboard-ia-review-report-v1.md）
- 包含：現狀分析、問題清單、改善建議、優先級

## 不可做的事

- ❌ 不動任何 source code
- ❌ 不動 schema/migration
- ❌ 不產生 implementation plan
- ❌ 不改 service/token/ACL

## 風險

- 🟢 LOW — 純架構審查，無實作風險
- 主要風險：範圍過大 → 已限縮

---

**小新，圖紙在這裡了。請批准後我開始審查。**
