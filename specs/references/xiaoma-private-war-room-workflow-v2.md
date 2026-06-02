# 小馬 Private War Room 工作流正式化 v2

**版本**: v2 | **日期**: 2026-06-01 | **狀態**: Codex findings 修正版，待 final review
**修正**: F1-F5 全部接受並修正

---

## 1. 角色分工

```
小新 = 意志 / 方向 / 最終批准
小馬 = 神經系統 / 長期記憶 / 生活脈絡 / 任務調度
OPC  = 小馬內部研究與設計團隊
Codex bot = 被召喚式工程審查官（不批准、不實作、不主動）
Base  = 可靠器官 / 事實資料庫（如 Detabase）
```

### 核心鐵律（F1 修正：Codex 邊界寫死）

| 角色 | 擁有 | 不擁有 |
|:-----|:------|:--------|
| **Base** | 事實資料、結構化數據 | 記憶、脈絡、建議 |
| **小馬** | 理解、脈絡、記憶、建議閉環 | 最終批准、工程實作 |
| **Codex** | 工程審查、驗證、反駁 | **決策、批准、實作**（本工作流不定義 implement mode） |
| **小新** | 方向、批准、選擇 | 技術細節（不必） |

---

## 2. Private War Room Boundary

Telegram 作戰室僅允許三位成員：

| 身份 | 說明 |
|:-----|:------|
| 小新 | 人類，唯一決策者 |
| 小馬 bot | AI 作戰副駕 |
| Codex bot | 被召喚式工程審查官 |

### 邊界規則

- 非白名單 user → reject + audit log
- 錯誤 chat/topic → reject + audit log
- 群組成員變更 → SAFE_LOCKED 鎖定
- SAFE_LOCKED 僅允許 status/help
- 轉發訊息 → reject
- Codex bot 不發送到其他 chat
- ACL fail-closed：缺少配置不啟動

---

## 3. War Room Conversation Protocol

### 標準流程（6 步驟）

```
Step 1: 小新提出目標
  ↓
Step 2: 小馬理解情境 + 長期脈絡
  ↓
Step 3: 小馬召喚 Codex bot（附 Context Packet）
  ↓
Step 4: Codex bot 以獨立身份回覆 findings
  ↓
Step 5: 小馬回應 Codex findings + 方案建議（逐項接受/不接受/暫緩，附理由）
  ↓
Step 6: 小新批准 / 修正 / 暫停
```

### 簡化流程（低風險）

```
Step 1: 小馬直接召喚 Codex
Step 2: Codex 回覆
Step 3: 小馬回應 + 保存報告
Step 4: 小新批准
```

---

## 4. Context Packet 格式（F2 修正：補齊欄位）

### 必填欄位

```yaml
schema_version: 1
event_id: "uuid"               # 唯一事件 ID（防重處理）
task_id: "string"              # 任務編號
parent_task: null              # 上一輪 task_id（Round 2 時填 Round 1）
audit_round: 1                 # 1 或 2
requester: "小馬"
review_type: "spec|diff|security|migration"
objective: "審查目標"
repo: "detabase"
base_ref: "main"               # 對比基準
target_ref: "working tree"     # 審查目標版本
changed_files_with_reason:     # 檔案清單 + 理由
  - path: "path/to/file.ts"
    reason: "why relevant"
acceptance_criteria:           # 驗收標準
  - "條件 1"
test_evidence:                 # 測試結果（非 test_command 單一欄位）
  - command: "npm test"
    result: "pass/fail/not_run"
prior_findings:                # 上輪 findings 處理狀態
  - job_id: "..."
    status: "accepted|rejected|deferred"
risk_level: "LOW / MED / HIGH"
out_of_scope:                  # 明確排除範圍
  - "非本次任務項目"
explicit_question: "給 Codex 的具體問題"
decision_required: true        # 是否需要小新決策
requested_decision_owner: "小新"
constraints:
  - "read-only sandbox"
  - "不實作、不批准"
  - "最多兩輪"
ai_advice_loop_note: "AI advice loop 歸小馬，不進 Detabase"
known_constraints:
  - "no source edit"
  - "two-round max"
relevant_specs:
  - "specs/path"
```

### Codex bot 回覆格式

```
結論: Go / No-Go / Go with fixes
Findings:
  1. [LEVEL] 描述 | 位置
  2. [LEVEL] 描述 | 位置
Risk Level: HIGH / MED / LOW
Issues requiring decision:
  - 問題 1
Suggested next step: ...
Requires 小新 approval: yes/no
```

---

## 5. 防 Loop 機制（F3 修正：完整定義）

| 規則 | 說明 |
|:-----|:------|
| 同一 task_id 最多兩輪 audit | Round 3 強制交小新裁決 |
| Round 2 觸發條件 | 需有新 diff / 新決策 / 小新要求 |
| parent_task 防繞過 | 新 task 須引用 parent_task，不可用新 task_id 重跑 |
| Round 2 後仍有 HIGH | 小新選擇：修 / 接受風險 / 降 scope / 停止任務 |
| Codex 不自動召喚任何人 | 只回應 command |
| 小馬不無限重跑 audit | 同一 parent_task 最多 2 輪 |

### 停止語義

```
- Round 2 + no HIGH findings → 任務結束
- Round 2 + still HIGH → 交小新裁決（4 選 1）
- 繞過 parent_task 重跑 → 被 reject
```

---

## 6. 安全閘門（F4 修正：4 層完整定義）

| 層級 | 機制 | 範圍 | 強度 |
|:----:|:-----|:-----|:----:|
| L1 | Command allowlist | 只允許 /codex_audit, /codex_review, /codex_status, /codex_help, /codex_cancel | ✅ 不可放 |
| L2 | Intent gate | 擋 implement/edit/commit/push/deploy/delete 等關鍵字 | ✅ 小新/小馬跳過（自由討論必要，output redaction 為最後防線） |
| L3 | Path denylist | 擋 .env* / .key / credential / token / secret / private key 等路徑（小新/小馬跳過） | ✅ 已放寬 |
| L4 | Output redaction | Telegram 摘要、完整 report、error log、job summary 全部遮罩；高 confidence pattern 整份 quarantine | ✅ 不可放 |

---

## 7. Codex Findings 回應與閉環（F5 新增）

### 小馬回應模板

```
📋 Codex Audit #{job_id} 分析：

✅ 接受 findings:
  • Finding 1: (接受理由)
  • Finding 2: (接受理由)

⏳ 暫緩:
  • Finding 3: (暫緩理由，何時處理)

❌ 不接受:
  • Finding 4: (不接受理由)

修正方案：...
對小新的影響：...

📄 報告已保存: specs/reports/codex-audit-{task_id}.md

下一個批准點：小新是否批准上述方案？
```

### Findings 狀態追蹤

| 狀態 | 意義 | 責任人 |
|:-----|:------|:-------|
| accepted | 接受並修正 | 小馬 |
| resolved | Codex 驗證確認已修復 | Codex（下一輪 audit 確認） |
| deferred | 暫緩，標記預計處理時間 | 小馬（通知小新） |
| rejected | 不接受，附理由 | 小馬（小新可 override） |

### 可見性閉環

- Codex 的回覆必須同時出現在 Telegram 群組（小新可見）+ reply.json（小馬可讀）
- 小馬的回應也必須出現在群組
- 報告存到 specs/reports/ 供追溯

---

## 8. trigger.json 結構化格式（即時對話用）

### 小馬 → Codex bot 通訊格式

```yaml
# ~/.codex-bot/trigger.json
schema_version: 1
event_id: "uuid"
source: "xiaoma"
actor: "小馬"
intent: "review_request | reply_needed | status_update | handoff"
requires_response: true
response_deadline: "optional"
priority: "normal | high"
thread_context: "任務 ID 或摘要"
text: "訊息內容"
```

### Codex bot → 小馬 通訊格式

```yaml
# ~/.codex-bot/reply.json
schema_version: 1
ts: "timestamp"
job_id: "uuid"
exit_code: 0
duration_ms: 12345
summary: "回覆摘要"
summary_full: "完整內容（前 5000 字）"
report_path: "reports/..."
```

---

## 9. 小新批准點

以下事項需要小新明確批准：

- [ ] Phase transition（Phase 1B → 1C）
- [ ] Codex bot 權限變更
- [ ] 新長期服務上線
- [ ] Schema / migration 變更
- [ ] Production 操作
- [ ] 風險接受（High finding 不修）
- [ ] 工作流協議變更

---

*本文件 v2 已修正 Codex audit 5 項 findings（F1-F5），待 Codex final review + 小新批准。*
