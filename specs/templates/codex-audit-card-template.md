# Codex Audit Card Template

**用途**: 需要 Codex CLI 做 read-only 審計時的任務卡。
**前提**: 可直接使用，不需小新批准。
**SOP 參考**: `specs/references/codex-cli-delegation-sop-v1.md`

---

```yaml
title: "Codex Audit: {功能名稱}"
priority: "{P0|P1|P2|P3}"
mode: audit
assignee: codex
codex_allowed: audit
repo_path: "{/home/janzongxin/projects/detabase}"
spec_path: "{specs/references/{相關 spec}}"
output_path: "{specs/reports/codex-audit-{name}.md}"
evidence_required: true

# 審計目標
goal: >
  {一句話描述審計目標}

# 審計範圍
scope:
  includes:
    - "{讀取檔案 1}"
    - "{讀取檔案 2}"
    - "{分析範圍 1}"
  excludes:
    - "{不修改任何檔案}"
    - "{不執行 migration}"

# 優先讀取的檔案
files_to_read_first:
  - "{path/to/file1} — {為什麼讀}"
  - "{path/to/file2} — {為什麼讀}"
  - "{path/to/file3} — {為什麼讀}"

# 禁止行為（audit mode 強制）
forbidden_actions:
  - ❌ patch / write_file 到 src/ app/ migrations/
  - ❌ npm install / npm run build
  - ❌ git commit / git push
  - ❌ 執行 migration
  - ❌ 修改任何檔案

# 驗收條件
acceptance_criteria:
  - "{所有指定檔案已讀取}"
  - "{每個發現有 conclusion-first 摘要}"
  - "{產出檔案存在於 output_path}"
  - "{沒有違反 mode 限制（read only）}"

# 使用者情境
user_context: >
  {小新的使用情境、限制、偏好}

# 回報格式
handoff_back_format: |
  1. 讀了哪些檔案
  2. 每個發現（conclusion-first）
  3. 是否遵守了 audit mode 限制
  4. 輸出檔案路徑
  5. 建議的下一步
```

---

## 使用時機

- 第一輪 schema / codebase 審計
- 架構判斷（某功能是否已支援）
- 風險分析
- 技術方案比較
- 確認 spec 中設計的可實作性

## 實際範例

```yaml
title: "Codex Audit: P0-1 account schema & balance calculation"
priority: P0
mode: audit
assignee: codex
codex_allowed: audit
repo_path: /home/janzongxin/projects/detabase
output_path: specs/reports/codex-audit-p0-1.md
goal: >
  審計 finance_accounts schema 是否支援 initial_balance，
  以及 Dashboard 餘額計算邏輯。
scope:
  includes:
    - 讀 finance_accounts migration schema
    - 讀 Dashboard balance 計算 hook
    - 讀 Settings AccountsTab 元件
    - 產出審計報告
  excludes:
    - 修改任何檔案
    - 執行 migration
    - npm install / build
forbidden_actions:
  - ❌ 修改任何檔案
  - ❌ 執行 npm install
  - ❌ git commit / push
acceptance_criteria:
  - 回答 initial_balance 是否已存在
  - 回答 Dashboard 餘額目前計算方式
  - 回答 Settings AccountsTab 現有功能
  - 沒有違反 read-only 限制
```
