# Task Card Template — 通用任務卡

**用途**: OPC Kanban 通用任務卡模板。每張新卡依此格式建立。

---

```yaml
title: "{P0|P1|P2|P3}-{流水號}: {功能名稱}"
priority: "{P0|P1|P2|P3}"
mode: "{audit|design|implement|review|ops}"
assignee: "{coordinator|knowledge-agent|architect|builder|reviewer|codex|xiaoma}"
repo_path: "{/home/janzongxin/projects/detabase}"
spec_path: "{specs/features/{name}/spec.md}"
output_path: "{specs/reports/{name}-report.md}"
evidence_required: true
codex_allowed: "{false|audit|implement}"

# 上下文（選填）
context:
  - "{事實 1}"
  - "{事實 2}"
  - "{事實 3}"

# 前置依賴（選填）
depends_on:
  - "{t_XXXXXXXX}"
parent: "{t_XXXXXXXX}"

# 禁止行為（必要）
forbidden_actions:
  - "{❌ 禁止行為 1}"
  - "{❌ 禁止行為 2}"
  - "{❌ 禁止行為 3}"

# 驗收條件（必要）
acceptance_criteria:
  - "{✅ 條件 1}"
  - "{✅ 條件 2}"
  - "{✅ 條件 3}"
  - "{✅ 條件 4}"
```

---

## 填寫指引

| 欄位 | 必填 | 說明 |
|:-----|:----:|:------|
| title | ✅ | 含優先級前綴 + 流水號 + 功能名稱 |
| priority | ✅ | P0（阻塞/核心） / P1（重要） / P2（次要） / P3（長期） |
| mode | ✅ | audit（研究/審計） / design（設計 spec） / implement（實作） / review（審查） / ops（營運） |
| assignee | ✅ | 只能從 assignee 清單中選 |
| repo_path | ✅ | 必填，方便 worker 定位 |
| spec_path | ✅ | 若 mode=design 則為產出路徑；若 mode=implement 則為依賴的 spec |
| output_path | ✅ | 產出檔案寫到哪裡 |
| evidence_required | ✅ | 預設 true，完成時附驗證證據 |
| codex_allowed | ✅ | false / audit / implement |
| context | 🔶 | 已知事實，減少 worker 摸索 |
| depends_on | 🔶 | 上游卡 ID，幫助 dispatcher 排序 |
| parent | 🔶 | 母卡 ID |
| forbidden_actions | ✅ | 每張卡都要有明確禁止行為 |
| acceptance_criteria | ✅ | 驗收條件，可測試 |

## Required Fields Gate（Inbox → Ready 前強制檢查）

卡在從 **Inbox 推進 Ready** 前，必須滿足以下條件，缺一不可：

| # | 檢查項目 | 檢查方式 |
|:--|:---------|:---------|
| 1 | ✅ `title` 有值且含優先級前綴 | 目視 |
| 2 | ✅ `priority` 是 P0/P1/P2/P3 | 目視 |
| 3 | ✅ `mode` 是 audit/design/implement/review/ops | 目視 |
| 4 | ✅ `assignee` 在允許清單中 | 對照 Assignee 對照速查表 |
| 5 | ✅ `repo_path` 指向有效路徑 | 目視確認 |
| 6 | ✅ `forbidden_actions` 至少 1 條 | 目視 |
| 7 | ✅ `acceptance_criteria` 至少 2 條 | 目視 |
| 8 | ✅ `codex_allowed` 明確設為 false/audit/implement | 目視 |
| 9 | ✅ 無 `default_assignee` 殘留（已分配具體 assignee） | 對照 |
| 10 | 🔶 若有 codex_allowed=implement → `spec_path` 指向已批准的 spec | 上游 spec 必須在 approved 狀態 |

**誰檢查：** coordinator 或小馬（開卡時），非必備欄位缺漏直接退回補件。不通過的卡留在 Inbox。

## Freeze Policy Check（開卡前先檢查）

若 repo 處於 **凍結狀態**（小新外出、系統維護中、或 coordinator 公告 freeze），**不得** 開新 implement 或 design 卡，只能開 ops 或 audit 卡。

檢查方式：
1. 查看 `~/.hermes/.freeze` 文件是否存在（由 freeze policy 設定）
2. 若存在 → 僅允許 mode: audit | ops
3. 若不存在 → 正常開卡
4. coordinator 或小馬開卡時第一件事就是檢查凍結狀態

---

## Assignee 對照速查

| Assignee | 什麼 mode 可用 | 限制 |
|:---------|:---------------|:-----|
| coordinator | ops | 只拆任務、開卡、追蹤 |
| knowledge-agent | audit, design | 每任務最多 1 份 specs 文件輸出 |
| architect | design | 最多開 1 張 research 卡 |
| builder | implement | 沒 approved spec 不准改碼 |
| reviewer | review | 不准修 code |
| codex | audit, implement | audit 直接可用；implement 需小新批准 |
| xiaoma | ops, review | 總結、判斷、回報 |

---

## 範例

```yaml
title: "P0-1: 帳戶初始金額與零錢盒設定"
priority: P0
mode: design
assignee: architect
repo_path: /home/janzongxin/projects/detabase
spec_path: specs/features/account-initial-balance/spec.md
output_path: specs/features/account-initial-balance/spec.md
evidence_required: true
codex_allowed: false
context:
  - initial_balance 已存在於 finance_accounts
  - Settings 已有 AccountsTab
  - coin_box 使用 is_coin_box boolean
forbidden_actions:
  - 不新增 Edge Function
  - 不做 transfer schema
  - 不自動修改銀行餘額
acceptance_criteria:
  - spec 明確列出 migration 最小方案
  - spec 明確列出 UI validation
  - spec 明確列出受影響檔案
  - Codex 可直接依 spec 實作
```
