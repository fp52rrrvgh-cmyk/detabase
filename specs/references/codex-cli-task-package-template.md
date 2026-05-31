# Codex CLI Task Package 模板

**用途**: 小馬 → Codex CLI 的標準任務包格式，統一用於審計與實作。

---

```markdown
## Task: {task_id}

### mode
{codex-audit | codex-implement}

### repo_path
{/home/janzongxin/projects/...}

### goal
一句話：{誰} 想要 {做什麼}，因為 {為什麼}

### scope
包含：
- {做項目 1}
- {做項目 2}

不包含：
- {不做項目 1}
- {不做項目 2}

### files_to_read_first
1. {path/to/file1} — {為什麼讀}
2. {path/to/file2} — {為什麼讀}
3. {path/to/file3} — {為什麼讀}

### forbidden_actions
- ❌ {禁止行為 1}
- ❌ {禁止行為 2}

### output_path
{path/to/output.md}

### acceptance_criteria
- [ ] {驗收條件 1}
- [ ] {驗收條件 2}
- [ ] {驗收條件 3}

### user_context
{小新的使用情境、限制、偏好}

### handoff_back_format
回報時請包含：
1. 讀了哪些檔案
2. 每個發現（conclusion-first）
3. 是否遵守了 mode 限制
4. 輸出檔案路徑（如果有的話）
5. 建議的下一步
```

---

## 實際範例：codex-audit

```markdown
## Task: P0-001-audit

### mode
codex-audit

### repo_path
/home/janzongxin/projects/detabase

### goal
審計 finance_accounts schema 是否支援 initial_balance，以及 Dashboard 餘額計算邏輯。

### scope
包含：
- 讀 finance_accounts migration schema
- 讀 Dashboard balance 計算 hook
- 讀 Settings AccountsTab 元件
- 產出審計報告

不包含：
- 修改任何檔案
- 執行 migration
- npm install / build

### files_to_read_first
1. supabase/migrations/20260518015307_create_finance_mvp_schema.sql — 原始 finance_accounts 定義
2. apps/web/app/dashboard/hooks/useDashboard.ts — Dashboard 餘額計算 hook
3. apps/web/app/settings/AccountsTab.tsx — 現有帳戶管理元件

### forbidden_actions
- ❌ 修改任何檔案（read only）
- ❌ 執行 npm install / npm run build
- ❌ git add / commit / push

### output_path
specs/reports/codex-audit-p0-1.md

### acceptance_criteria
- [ ] 回答 initial_balance 是否已存在
- [ ] 回答 Dashboard 餘額目前計算方式
- [ ] 回答零錢盒建議實作方式
- [ ] 產出 implementation plan（不改 code）

### user_context
26 噸大貨車司機，單手操作 iPhone，疲勞狀態。系統需要零錢盒概念（每天丟零錢，年末提醒轉帳）。

### handoff_back_format
回報時請包含：
1. 讀了哪些檔案
2. 每個審計發現（conclusion-first）
3. 是否遵守了 read-only 限制
4. 報告檔案路徑
5. Implementation plan
```

---

## 實際範例：codex-implement

```markdown
## Task: P0-001-implement

### mode
codex-implement

### repo_path
/home/janzongxin/projects/detabase

### goal
在 settings/AccountsTab 新增 is_coin_box 切換開關，允許使用者標記帳戶為零錢盒。

### scope
包含：
- 修改 AccountsTab.tsx 新增 is_coin_box toggle
- 更新 insert/update payload 包含 is_coin_box
- 跑 npm run build 確認通過

不包含：
- 修改 Dashboard 顯示（下一張卡）
- 新增 migration（已由架構師產出）
- git commit

### files_to_read_first
1. apps/web/app/settings/AccountsTab.tsx — 主要修改目標
2. specs/features/coin-box/spec.md — 架構師的 spec

### forbidden_actions
- ❌ git commit / push
- ❌ 修改不在 scope 的檔案
- ❌ 自行決定架構變更

### output_path
無（直接修改 source）

### acceptance_criteria
- [ ] AccountsTab 有 is_coin_box toggle
- [ ] 新增/更新帳戶時 is_coin_box 正確寫入 DB
- [ ] npm run build 通過
- [ ] 手動測試：新增零錢盒帳戶 → 確認 DB 寫入正確

### user_context
小新希望零錢盒操作簡單：開關點一下就好，不需要多餘步驟。iPhone Safari 操作。

### handoff_back_format
回報時請包含：
1. 修改的檔案清單
2. 關鍵程式碼片段
3. npm run build 結果
4. 測試結果
```
