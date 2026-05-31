# Codex Implement Card Template

**用途**: 需要 Codex CLI 做實作時的任務卡。
**前提**: ⚠️ **必須有小新批准的 approved spec**，否則不可使用。
**SOP 參考**: `specs/references/codex-cli-delegation-sop-v1.md`

---

```yaml
title: "Codex Implement: {功能名稱}"
priority: "{P0|P1|P2|P3}"
mode: implement
assignee: codex
codex_allowed: implement
repo_path: "{/home/janzongxin/projects/detabase}"
spec_path: "{specs/features/{name}/spec.md}"
output_path: "{specs/reports/codex-implement-{name}.md}"
evidence_required: true

# 實作目標
goal: >
  {一句話描述要實作什麼}

# 實作範圍
scope:
  includes:
    - "{新增 migration: supabase/migrations/{name}.sql}"
    - "{修改檔案 1: 改什麼}"
    - "{修改檔案 2: 改什麼}"
    - "{新增檔案: 新增什麼元件}"
  excludes:
    - "{不做項目 1}"
    - "{不做項目 2}"

# 優先讀取的檔案
files_to_read_first:
  - "{spec_path} — 依賴的 approved spec"
  - "{path/to/file1} — {為什麼讀}"
  - "{path/to/file2} — {為什麼讀}"
  - "{path/to/reference} — {codex-cli-delegation-sop-v1.md}"

# 禁止行為（implement mode）
forbidden_actions:
  - ❌ git commit / git push
  - ❌ npm install（除非任務明確允許）
  - ❌ 修改不在此任務 scope 中的檔案
  - ❌ 執行 migration（只產出 migration 檔案）
  - ❌ 修改 RLS / GRANT 語句
  - ❌ 修改 .env.local 或環境變數
  - ❌ 自行擴充 scope

# 驗收條件
acceptance_criteria:
  - "{條件 1: migration backward compatible}"
  - "{條件 2: invalid amount 不可靜默變 0}"
  - "{條件 3: mobile UI 不變複雜}"
  - "{條件 4: build 通過}"
  - "{條件 5: TypeScript 無錯誤}"
  - "{條件 6: 所有指定的 acceptance_criteria 滿足}"

# 使用者情境
user_context: >
  小新是 26 噸大貨車司機，使用 iPhone 15 Pro Max 操作。
  使用場景包含開車、夜車、搬貨現場、疲勞狀態、單手操作。
  需要超低操作步數、行動優先、可中斷接續設計。
  繁體中文使用者。

# 回報格式
handoff_back_format: |
  1. 修改的檔案清單（含新增檔案）
  2. 每個檔案的關鍵變更摘要
  3. 關鍵程式碼片段（新 migration SQL、type 定義、JSX）
  4. npm run build 結果（成功/失敗、錯誤訊息）
  5. 是否完全滿足所有驗收條件（逐條標記 ✅/❌）
  6. 若有未滿足的，說明原因與建議修正
  7. 實施後的風險評估
```

---

## 使用時機

- 小新已批准 approved spec
- 功能範圍明確，不模糊
- 已知的 bug fix（有明確的 fix spec）
- 不適合：需求模糊、需要反覆迭代探索的功能

## 實際範例

```yaml
title: "Codex Implement: P0-1 account initial balance + coin box"
priority: P0
mode: implement
assignee: codex
codex_allowed: implement
repo_path: /home/janzongxin/projects/detabase
spec_path: specs/features/p0-1-account-settings/spec-v2.md
output_path: specs/features/p0-1-account-settings/implementation-report.md
goal: >
  在 AccountsTab 新增 is_coin_box 零錢盒標記功能
  （含 migration + UI toggle + Dashboard 標示 + Quick-capture + ai-get-user-refs）
scope:
  includes:
    - 新增 migration: supabase/migrations/20260531000001_add_coin_box_field.sql
    - 修改 AccountsTab.tsx: type + select + toggle + badge + CRUD
    - 修改 useDashboard.ts: AccountSummary 加 isCoinBox
    - 修改 Dashboard 帳戶總覽: 🪙 標示
    - 修改 Quick-capture 帳戶選單: 🪙 標示
    - 修改 ai-get-user-refs: 回傳 is_coin_box
  excludes:
    - git commit / push
    - 修改 RLS 策略
    - 修改 budgets/subscriptions
    - 年末結算轉帳按鈕（P1）
forbidden_actions:
  - ❌ git commit / push
  - ❌ 修改不在此任務中的檔案
  - ❌ 執行 migration
  - ❌ npm install
acceptance_criteria:
  - migration 檔含正確的 is_coin_box + check constraints
  - AccountsTab type + select + CRUD 全含 is_coin_box
  - toggle 僅在 account_type = 'cash' 時顯示
  - 編輯表單正確讀取 acct.is_coin_box
  - 列表行顯示 🪙 badge
  - Dashboard 帳戶總覽顯示 🪙 標示
  - Quick-capture 帳戶選單標示 🪙
  - ai-get-user-refs 回傳 is_coin_box
  - npm run build 通過，TypeScript 無錯誤
```
