# P0 #1 Spec v2 審查報告

**審查員**：稽核官（OPC Reviewer）
**審查標的**：`specs/features/p0-1-account-settings/spec-v2.md`
**設計來源**：`specs/features/p0-1-account-settings/design.md` (Architect)
**任務包**：`specs/sop/codex-task-p0-1-implement.json`
**日期**：2026-05-31

---

## 1. Summary

**判定：MINOR_ISSUES**

Spec v2 整體完整度高，涵蓋 Architect 設計絕大部分要點，migration SQL 正確可執行，JSON 任務包一致。有 1 個 P1 不一致（年終結算按鈕矛盾）和 2 個 P2 缺失（「已有零錢盒」提示、Quick-capture 路徑模糊），無 BLOCKING 問題。

---

## 2. Findings

### A. 完整性檢查

| # | 問題 | 優先級 | 位置 | 說明 | 建議修正 |
|---|------|--------|------|------|---------|
| A1 | ⚠️ 年終結算按鈕矛盾 | **P1** | Spec v2 §2「不包含」 vs Architect §4.4 | Architect 明確指出「在 P0 #1 中先放按鈕但顯示 coming soon」，但 Spec v2 將其列為「❌ 不包含」，卻又在備註寫「本版僅放 placeholder 按鈕」—— 前後矛盾。要嘛包含 placeholder 按鈕，要嘛完全排除。 | 統一為「✅ 包含：年末結算按鈕（coming-soon placeholder）」或明確排除並刪除矛盾備註。 |
| A2 | ⚠️ 缺少「已有零錢盒」UI 提示 | **P2** | Spec v2 §3.1, Architect §1.4(3) | Architect 要求「同一 user 不限制多個零錢盒數量，但 UI 提示『已有零錢盒存在』」，Spec v2 未實作此提示。 | 在新增表單 toggle 時，檢查是否已有零錢盒，若有則顯示 toast 提示「你已有一個零錢盒」。 |
| A3 | ✅ Migration SQL 完整 | — | §4.1 | 2 個 check constraints + 可選部分索引，參照現有欄位正確（`credit_limit`/`billing_day`/`total_loan`/`loan_term_months`/`interest_rate` 均已存在於 `20260527230000`）。 | 無需修正。 |
| A4 | ✅ 檔案修改清單完整 | — | §6 | 明確列出 6 個需修改檔案。 | 無需修正。 |
| A5 | ✅ RLS/Grant 說明正確 | — | §4.3, §4.4 | `20260518015307` 的 RLS + `20260527230000` 的 GRANT 確實涵蓋新欄位。 | 無需修正。 |

### B. 一致性檢查

| # | 問題 | 優先級 | 位置 | 說明 | 建議修正 |
|---|------|--------|------|------|---------|
| B1 | ✅ / ⚠️ 年終結算按鈕不一致 | **P1** | (同 A1) | 同上，Architect 明確說要放 placeholder 按鈕，Spec v2 與之矛盾。 | 同 A1。 |
| B2 | ✅ JSON 任務包與 Spec v2 一致 | — | `codex-task-p0-1-implement.json` | 所有 includes/excludes/acceptance_criteria 與 Spec v2 完全對齊。 | 無需修正。 |
| B3 | ✅ Migration SQL 與 schema 現狀一致 | — | §4.1 vs 現有 migrations | `account_type` check constraint 經 `20260529000001` 更新後為 `('cash','bank','credit_card','stored_value','digital_account','other')`，Spec v2 §4.2 描述正確。零錢盒使用 `'cash'` 不需擴充。 | 無需修正。 |
| B4 | ✅ 現有 migration 編號正確 | — | — | 最新 migration 為 `20260529000001`，新 migration `20260531000001` 編號正確且較大。 | 無需修正。 |

### C. 安全性檢查

| # | 問題 | 優先級 | 位置 | 說明 | 建議修正 |
|---|------|--------|------|------|---------|
| C1 | ✅ 無資料遺失風險 | — | §4.1 | `add column if not exists ... not null default false` 完全冪等，無 DROP 或 ALTER COLUMN TYPE，零資料遺失風險。 | 無需修正。 |
| C2 | ✅ RLS 覆蓋完整 | — | §4.4 | `"Users manage own finance accounts"` policy 涵蓋 all operations，新欄位自動繼承。 | 無需修正。 |
| C3 | ✅ 無 SQL injection | — | — | Migration SQL 為靜態語句，無外部輸入。Edge Function 使用 Supabase REST API（參數化查詢）。 | 無需修正。 |
| C4 | ✅ Check constraints 可安全套用 | — | §4.1 | 新欄位預設 `false`，現有資料均滿足 `not is_coin_box` 條件，constraint 建立不會失敗。 | 無需修正。 |

### D. 使用者情境檢查

| # | 問題 | 優先級 | 位置 | 說明 | 建議修正 |
|---|------|--------|------|------|---------|
| D1 | ✅ 行動優先 | — | §3.1 | Toggle 最小觸控面積 44×44px、iOS 風格，符合 iPhone 單手操作。 | 無需修正。 |
| D2 | ✅ 操作步數合理 | — | §3 | 啟用零錢盒僅需 2 步：選「現金」→ 開 toggle。 | 無需修正。 |
| D3 | ✅ 考慮疲勞/開車狀態 | — | §5.4, §5.5 | AI 語音記帳整合零錢盒辨識（「存 500 到零錢盒」），Quick-capture 標示 🪙，降低認知負擔。 | 無需修正。 |
| D4 | ✅ 無不必要的新增依賴 | — | §4, §5 | 全部使用現有 Supabase REST API，無新 Edge Function、無新 npm 套件。 | 無需修正。 |

### E. 品質檢查

| # | 問題 | 優先級 | 位置 | 說明 | 建議修正 |
|---|------|--------|------|------|---------|
| E1 | ✅ Migration 命名一致 | — | §4.1 | `YYYYMMDDHHMMSS_descriptive_name.sql` 格式，與現有 27 個 migration 一致。 | 無需修正。 |
| E2 | ⚠️ Quick-capture 檔案路徑模糊 | **P2** | §6 最後一行 | `apps/web/app/...` 沒有具體路徑，實作者需自行搜尋。 | 補上實際路徑（例如 `apps/web/app/transactions/components/QuickCapture.tsx` 或搜尋確認後填入）。 |
| E3 | ✅ UI 描述具體到可實作 | — | §3 | 精準標示行號（403-408、293-323、331）、提供 JSX 片段、mapping 程式碼。 | 無需修正。 |
| E4 | ✅ 驗收標準可測試 | — | §7 | 17 項驗收標準均為具體可觀察/可執行（migration 執行、toggle 顯示、data flow 驗證、build 通過）。 | 無需修正。 |
| E5 | ✅ partial index 納入合理 | — | §4.1 L159-162 | Architect 標為「選擇性」，Spec 納入但放在 migration 中。部分索引低風險、查詢效益可接受。 | 無需修正。 |

---

## 3. Recommendations

### 建議修正順序

| 順序 | 問題 | 優先級 | 修正難度 | 時機 |
|------|------|--------|---------|------|
| 1 | **A1/B1：年終結算按鈕矛盾** | P1 | 極小（文字修正） | **實作前必須解決** |
| 2 | **A2：缺少「已有零錢盒」UI 提示** | P2 | 小（+5-10 行程式碼） | 實作時一併加入 |
| 3 | **E2：Quick-capture 路徑模糊** | P2 | 極小（補上路徑） | 實作前確認並更新 |

### 建議修正細節

#### 1. 年終結算按鈕（P1）

**方案 A（依 Architect 設計）**：
在 Spec v2 §2「不包含」表格中移除此項目，在 §2「包含」表格新增：
```
| 年末結算按鈕（placeholder） | 帳戶列表行顯示「📤 年末結算」按鈕，點擊顯示「Coming Soon」 |
```

**方案 B（維持不包含）**：
將 §2「不包含」備註改為：
```
| 年末結算轉帳按鈕（含 placeholder） | 延至 P1，本版不安裝任何按鈕 |
```

#### 2. 已有零錢盒提示（P2）

在 Spec v2 §3.1 Toggle 行為規則中新增：
```
| 新增 toggle 為 true 時，若該 user 已有其他零錢盒 | Toast 提示「已有零錢盒，確定要再新增一個？」 |
```

#### 3. Quick-capture 路徑（P2）

找出實際的 Quick-capture 元件路徑後更新 §6：
```
| `apps/web/app/quick-capture/QuickCapture.tsx`（或實際路徑） | 修改 | 帳戶選單標示 🪙 |
```

---

## 4. Final Verdict

### ✅ 條件通過（MINOR_ISSUES — 條件通過）

**判定理由**：
- 無 BLOCKING 問題，migration SQL 可安全執行
- 無安全漏洞
- 與 Architect 設計高度一致（除年終結算按鈕）
- 使用者情境完整考量

**通過條件**：
1. **必須解決 A1/B1**：年終結算按鈕矛盾（決策是否包含 placeholder，並在 Spec 中明確表達）
2. 建議在實作時一併處理 A2（已有零錢盒提示）
3. 建議在實作前確認 E2（Quick-capture 檔案路徑）

**解決上述條件後，可進入實作階段。**
