# Debt Module v1 — 施工圖紙

**狀態**: 小馬提案 → Codex 審查/修正 → ✅ 共識 → ⏸️ 等小新批准

---

## 範圍

Debt Module v1: Manual Debt Tracker + Monthly Action Workflow

## Schema

`finance_debts` table：

| 欄位 | 類型 | 說明 |
|:-----|:------|:------|
| id | uuid PK | 自動 |
| user_id | uuid FK → auth.users | RLS |
| debt_type | text | credit_card / loan / installment / personal / other |
| creditor | text | 債權人/銀行 |
| principal | numeric | 原始本金 |
| remaining | numeric | 當前剩餘 |
| interest_rate | numeric | 年利率 % |
| min_payment | numeric | 最低每月應繳 |
| next_due_date | date | 下次到期日 |
| priority | text | manual / interest / smallest_balance |
| status | text | active / closed |
| notes | text | 備註 |
| closed_at | timestamptz | 結清日 |
| created_at / updated_at | timestamptz | 自動 |

## 功能

| 平台 | 功能 |
|:-----|:------|
| **手機** | 本月最低應繳總額、下一筆到期、逾期警示、可多還金額建議 |
| **桌機** | 完整表格 + 依利率/金額/到期日排序 |
| **Dashboard** | 總欠款、最低應繳、下一到期（整合到財務狀態區塊） |

## Edge Function

- `ai-get-debt-summary` — 供小馬讀取債務摘要（唯讀、不回傳過多原始資料）

## 第一版不做

- ❌ 還款紀錄（payment ledger）→ v2
- ❌ 自動扣款 / 串銀行
- ❌ 完整還款策略模擬（avalanche/snowball）
- ❌ 利息逐日計算

## 風險

🔴 HIGH — 新增 financial schema + RLS + AI 讀取邊界

## 施工流程（安全 SOP）

1. 小馬提 migration issue → Codex 審查
2. 小馬寫 migration → Codex 審查
3. 寫 Edge Function → Codex 審查
4. 建前端頁面 → Codex 審查
5. 整合 Dashboard → Codex 審查
6. Build + 驗證（清 .next、檢查 chunk、測 flow）
7. 小新最終驗收

---

**小新，圖紙在這裡。批准後開始照 SOP 施工。**
