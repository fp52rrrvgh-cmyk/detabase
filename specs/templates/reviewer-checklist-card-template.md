# Reviewer Checklist Card Template

**用途**: OPC Reviewer（稽核官）審查任務的標準檢查表。
**位置**: 每個 review mode 的卡完成時，產出審查報告到指定 output_path。

---

```yaml
title: "Review: {功能名稱}"
priority: "{P0|P1|P2|P3}"
mode: review
assignee: reviewer
repo_path: "{/home/janzongxin/projects/detabase}"
spec_path: "{specs/features/{name}/spec.md}"
output_path: "{specs/reports/review-{name}.md}"
evidence_required: true
codex_allowed: false

# 審查標的
review_targets:
  - "{specs/features/{name}/spec.md}"
  - "{specs/sop/codex-task-{name}.json}"
  - "{src/ 或改動的程式碼路徑}"

# 審查範圍
scope:
  includes:
    - 完整性檢查
    - 一致性檢查
    - 安全性檢查
    - 使用者情境檢查
    - 品質檢查
  excludes:
    - 不修改任何檔案
    - 不提供實作建議
    - 不提供替代實作方案

# 禁止行為
forbidden_actions:
  - ❌ 修改任何檔案
  - ❌ 提供替代實作方案
  - ❌ 自行修 code

# 驗收條件
acceptance_criteria:
  - 審查報告已產出到 output_path
  - 逐項 checklist 已填寫
  - 最終判定給出（PASS / MINOR_ISSUES / BLOCKING）
  - BLOCKING 問題附建議修正方向
```

---

## Reviewer Checklist（稽核官逐項檢查表）

審查時，以下 5 個維度必須全檢。產出報告時逐項標記 ✅ / ⚠️ / ❌。

### A. 完整性檢查

```
□ [ ] Spec / code 涵蓋所有功能需求？
□ [ ] 有遺漏的功能需求？
□ [ ] migration SQL 完整可執行？（若需要）
□ [ ] 缺少必要檔案修改清單？
```

### B. 一致性檢查

```
□ [ ] Spec v2 跟 Architect design 有矛盾？
□ [ ] JSON 任務包跟 Spec v2 內容一致？
□ [ ] migration SQL 跟 schema 現狀一致？
□ [ ] 跟已存在的決策（ADR）一致？
```

### C. 安全性檢查

```
□ [ ] migration 有潛在資料遺失風險？
□ [ ] RLS 覆蓋完整？
□ [ ] 有 SQL injection 或安全漏洞？
□ [ ] 如有 Edge Function：verify_jwt 設定正確？
```

### D. 使用者情境檢查

```
□ [ ] 符合行動優先（iPhone Safari）？
□ [ ] 操作步數過多？
□ [ ] 有考慮疲勞/開車狀態？
□ [ ] 有不必要的新增依賴？
□ [ ] 繁體中文？
```

### E. 品質檢查

```
□ [ ] migration 命名和編號跟現有檔案一致？
□ [ ] UI 描述具體到可實作？
□ [ ] 驗收標準可測試？
□ [ ] 沒有 MVP / TODO / FIXME 等標記？
□ [ ] TypeScript type 定義完整？
```

---

## 最終判定

| 判定 | 意義 | 後續動作 |
|:-----|:-----|:---------|
| **PASS** | 無問題 | 直接進入下一階段 |
| **MINOR_ISSUES** | 有 minor 問題但不 blocking | 小馬修復或記錄後繼續 |
| **BLOCKING** | 有重大問題 | 退回上一階段，附建議修正方向 |

### BLOCKING 的條件

符合以下任一條件即為 BLOCKING：
1. 安全漏洞（SQL injection、secret 洩漏、RLS 缺失）
2. 資料遺失風險（migration 沒用 IF NOT EXISTS、DROP TABLE）
3. 跟已確認的小新決策矛盾
4. 違反全域限制（coordinator 讀檔、builder 沒 spec 改碼等）
5. 架構設計錯誤（資料流中斷、核心邏輯遺漏）

---

## 產出報告格式

審查報告應包含以下結構：

```markdown
# {功能名稱} 審查報告

**審查員**: {reviewer | 稽核官}
**審查標的**: {specs/features/{name}/spec-v2.md}
**日期**: {YYYY-MM-DD}

---

## 1. Summary

{一句話結論：PASS / MINOR_ISSUES / BLOCKING}

## 2. Findings

| # | 問題 | 優先級 | 位置 | 說明 | 建議修正 |
|---|------|--------|------|------|---------|
| 1 | ... | P1 | ... | ... | ... |
| 2 | ... | P2 | ... | ... | ... |

## 3. 各維度檢查結果

### A. 完整性 — {✅ / ⚠️ / ❌}
...

### B. 一致性 — {✅ / ⚠️ / ❌}
...

### C. 安全性 — {✅ / ⚠️ / ❌}
...

### D. 使用者情境 — {✅ / ⚠️ / ❌}
...

### E. 品質 — {✅ / ⚠️ / ❌}
...

## 4. 最終判定

**{PASS / MINOR_ISSUES / BLOCKING}**
```
