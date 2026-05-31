# detabase OPC Kanban v1

**日期**: 2026-05-31 | **版次**: 1.0 | **擁有者**: 小新
**用途**: OPC 任務路由器，非一般待辦清單

---

## 一、定位

Kanban 是 OPC 的任務路由中樞，不是待辦清單。

- **小馬** — 開卡、追蹤、總結、回報小新
- **五個 profile** — 各司其職，嚴格遵守角色邊界
- **Codex** — 只接收已批准的工程任務包（codex-audit 或 codex-implement）
- **小新** — 批准 spec、驗收結果

---

## 二、Kanban 欄位

```
Inbox → Ready → In Progress → Review Required → Blocked → Done → Archive
```

| 欄位 | 說明 |
|:-----|:------|
| **Inbox** | 小新提出需求，尚未分解 |
| **Ready** | 已被 coordinator 分解為可執行單元，等待 assignee 認領 |
| **In Progress** | 被 assignee 認領，正在執行 |
| **Review Required** | 需要審查（reviewer 或小馬檢查） |
| **Blocked** | 被外部阻塞（等小新批准、等上游 dependency） |
| **Done** | 已完成，等待小馬總結回報小新 |
| **Archive** | 已被小馬確認為完成並關閉 |

---

## 三、Assignee / Profile 對照

| Assignee | 角色 | 做 | 不做 |
|:---------|:-----|:---|:-----|
| **coordinator** | 作戰管制官 | 拆任務、開卡、追蹤進度 | ❌ 不讀檔、不分析、不實作 |
| **knowledge-agent** | 情報官 | 查 specs / memory / web / session history，寫研究與 ADR | 每任務最多新增 1 份 specs 文件 |
| **architect** | 戰術架構官 | 寫 spec（產出 specs/features/{name}/spec.md） | ❌ 不寫 code、每任務最多開 1 張 research 卡 |
| **builder** | 工兵官 | 照 approved spec 實作 | ❌ 沒 approved spec 不准改碼 |
| **reviewer** | 稽核官 | 審查 build / test / spec compliance | ❌ 不修 code |
| **codex** | 外部主工程師 | 由小馬透過 Codex CLI delegation 呼叫 | 預設 audit-only；implement 必須有小新批准 |
| **xiaoma** | 小馬本體 | 總結、判斷、回報小新、開卡、驗收 | ❌ 不 bypass pipeline |

---

## 四、每張卡必備欄位

```
title           — 任務標題
assignee        — coordinator | knowledge-agent | architect | builder | reviewer | codex | xiaoma
priority        — P0 | P1 | P2 | P3
mode            — audit | design | implement | review | ops
status          — inbox | ready | in_progress | review_required | blocked | done | archived
parent          — 母卡 ID（選填）
depends_on      — 依賴卡 ID 列表（選填）
repo_path       — 專案絕對路徑
spec_path       — 相關 spec 路徑（選填）
output_path     — 產出檔案路徑
forbidden_actions  — 明確禁止行為列表
acceptance_criteria — 驗收條件列表
evidence_required  — true（預設）
codex_allowed      — false | audit | implement
```

---

## 五、標準流程

```
1. Inbox
   小新提出需求 → 小馬開卡放入 Inbox

2. Ready
   小馬（或 coordinator）將需求拆成 task graph，
   確認每張卡的 assignee、優先級、forbidden_actions

3. In Progress → 依 mode 分流：

   ├── mode: audit → knowledge-agent 研究 → architect 產 spec
   │                       ↓
   │                 小新批准 spec
   │                       ↓
   │                 可選：codex-audit（審計驗證）
   │
   ├── mode: design → knowledge-agent 查舊決策 → architect 產 spec
   │                       ↓
   │                 小新批准 spec
   │
   ├── mode: implement → builder（有 approved spec）或 codex-implement
   │                       ↓
   │                 reviewer 審查
   │                       ↓
   │                 小馬檢查是否符合小新情境 → 轉成摘要
   │
   └── mode: review → reviewer 審查 → 小馬總結

4. Review Required
   需要 reviewer 審查，或小馬檢查使用者情境

5. Blocked
   等小新批准、等上游 dependency、
   等待外部資源

6. Done
   小馬轉成小新能驗收的摘要 → 回報小新

7. Archive
   小新確認完成 → 歸檔
```

### Codex 呼叫時機

```
codex-allowed 條件：
  audit:    ✓ 直接可用，不需小新批准
  implement: ✗ 必須有小新批准的 approved spec
  false:    ✗ 不經 Codex

codex-audit 流程：
  小馬包裝 task package（依 codex-cli-delegation-sop-v1）
  → codex exec --full-auto '<task_package>'
  → 小馬做二次驗證（依 codex-cli-audit-review-checklist）

codex-implement 流程：
  小新批准 spec
  → 小馬包裝 implement task package
  → codex exec --full-auto '<task_package>'
  → reviewer 審查
  → 小馬檢查使用者情境
```

---

## 六、全域限制

1. **coordinator** 不准分析、不准讀檔、不准實作。只負責拆任務、開卡、追蹤。
2. **knowledge-agent** 每任務最多新增 1 份 specs 文件。
3. **architect** 每任務最多開 1 張 research 卡給 knowledge-agent。
4. **builder** 沒有 approved spec 不准改 code。spec 必須包含 migration 方案、UI validation、受影響檔案清單。
5. **reviewer** 不准修 code。只能給 blocking / minor / pass 判定。
6. **Codex** 預設 audit-only。implement 必須有小新批准的 approved spec。
7. **所有實作** 須 backward compatible：invalid amount 不可靜默變 0；mobile UI 不變複雜。
8. 不新增第十層。不新增大型治理系統。不讓 kanban 本身變成主專案。
9. 所有卡必須有 `evidence_required: true`。完成時附驗證證據。

---

## 七、各 mode 的完成條件

| Mode | 完成條件 |
|:-----|:---------|
| audit | 研究報告 / ADR / Codex audit report |
| design | specs/features/{name}/spec.md，含 migration、UI、資料流 |
| implement | code 已修改 + build 通過 + review 通過 |
| review | reviewer checklist 全部 ✅ |
| ops | cron / config / infra 變更已套用 + 驗證 |

---

## 八、P0 #1 任務卡範例

### 任務卡：帳戶初始金額與零錢盒設定

```yaml
title: "P0-1: 帳戶初始金額與零錢盒設定"
priority: P0
mode: design
assignee: architect
repo_path: ~/projects/detabase
spec_path: specs/features/account-initial-balance/spec.md
context:
  - initial_balance 已存在於 finance_accounts
  - Settings 已有 AccountsTab
  - coin_box 使用 is_coin_box boolean
  - transfer model 不納入本次
forbidden_actions:
  - 不新增 Edge Function
  - 不做 transfer schema
  - 不自動修改銀行餘額
  - 不使用 MVP 字眼
acceptance_criteria:
  - spec 明確列出 migration 最小方案
  - spec 明確列出 UI validation
  - spec 明確列出受影響檔案
  - Codex 可直接依 spec 實作
```

### Codex 實作卡：P0-1

```yaml
title: "Codex Implement: P0-1 account initial balance + coin box"
assignee: codex
codex_allowed: implement
requires:
  - approved_spec_path: specs/features/account-initial-balance/spec.md
  - codex-cli-delegation-sop-v1.md
forbidden_actions:
  - git commit
  - npm install
  - transfer model
  - Edge Function
  - production DB
output_path: specs/reports/codex-implement-p0-1.md
acceptance_criteria:
  - migration backward compatible
  - invalid amount 不可靜默變 0
  - mobile UI 不變複雜
  - build/test 結果附上
```

---

## 九、通知機制

### Per-task Telegram 通知

使用 `notify-subscribe` 讓特定任務在狀態變更（done / blocked / review_required）時推送到 Telegram：

```bash
hermes kanban notify-subscribe \
  --platform telegram \
  --chat-id 8566043952 \
  --notifier-profile coordinator \
  <task_id>
```

- 用 `notify-list` 查看所有訂閱
- 用 `notify-unsubscribe <task_id>` 取消
- 通知由 **coordinator profile** 的 gateway 負責傳送
- 目前已在用：`t_361f094c`（reviewer）、`t_a555d5d1`（knowledge-agent）

### 內部 Pipeline 通知

coordinator profile 每 30 秒透過 dispatch 輪詢 board，自動發現子任務狀態變更並推進流程。不需額外設定。

## 十、系統設定（2026-05-31）

| 設定 | 值 | 說明 |
|:-----|:---|:------|
| `default_assignee` | coordinator | 無指定 assignee 的新卡預設派 coordinator |
| `dispatch_interval_seconds` | 30 | profile 輪詢間隔 |
| `auto_decompose` | true | 自動分解子任務 |
| `auto_decompose_per_tick` | 3 | 每 tick 最多分解卡數 |
| `gateway_notify_interval` | 180 | gateway 通知檢查間隔（秒） |
| `orchestrator_profile` | coordinator | 編排者 profile |

## 十一、相關文件

- `specs/templates/task-card-template.md` — 通用任務卡模板
- `specs/templates/codex-audit-card-template.md` — Codex audit 卡模板
- `specs/templates/codex-implement-card-template.md` — Codex implement 卡模板
- `specs/templates/reviewer-checklist-card-template.md` — Reviewer checklist 模板
- `specs/references/codex-cli-delegation-sop-v1.md` — Codex CLI 交付 SOP
- `specs/references/codex-cli-audit-review-checklist.md` — Codex audit 審查清單
- `specs/references/codex-cli-task-package-template.md` — 任務包模板
