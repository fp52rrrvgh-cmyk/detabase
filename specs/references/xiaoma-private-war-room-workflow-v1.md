# 小馬 Private War Room 工作流正式化 v1

**版本**: v1 | **日期**: 2026-06-01 | **狀態**: Night Build 產出，待小新批准
**來源**: context file `xiaoma-war-room-and-detabase-context-v1.md` + Phase 1B 協議討論

---

## 1. 角色分工

```
小新 = 意志 / 方向 / 最終批准
小馬 = 神經系統 / 長期記憶 / 生活脈絡 / 任務調度
OPC  = 小馬內部研究與設計團隊
Codex bot = 工程審查 / 驗證 / 技術反駁
Base  = 可靠器官 / 事實資料庫（如 Detabase）
```

### 核心鐵律

| 角色 | 擁有 | 不擁有 |
|:-----|:------|:--------|
| **Base** | 事實資料、結構化數據 | 記憶、脈絡、建議 |
| **小馬** | 理解、脈絡、記憶、建議閉環 | 最終批准、工程實作 |
| **Codex** | 工程審查、驗證、反駁 | 決策、實作（除非授權） |
| **小新** | 方向、批准、選擇 | 技術細節（不必） |

---

## 2. Private War Room Boundary

Telegram 作戰室僅允許三位成員：

| 身份 | 說明 |
|:-----|:------|
| 小新 | 人類，唯一決策者 |
| 小馬 bot | AI 作戰副駕，Telegram bot |
| Codex bot | 被召喚式工程審查官，Telegram bot |

### 邊界規則

- 非白名單 user → reject + audit log
- 錯誤 chat/topic → reject + audit log
- 群組成員變更 → SAFE_LOCKED 鎖定
- SAFE_LOCKED 僅允許 status/help
- 轉發訊息（forwarded message）→ reject
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
Step 5: 小馬回應 Codex findings + 方案建議
  ↓
Step 6: 小新批准 / 修正 / 暫停
```

### 簡化流程（低風險）

```
Step 1: 小馬直接召喚 Codex
Step 2: Codex 回覆
Step 3: 小馬回應 + 保存
Step 4: 小新批准
```

---

## 4. Context Packet 格式

### 必填欄位

```yaml
task_id: "string"            # 唯一任務 ID
audit_round: 1               # 1 或 2
requester: "小馬"
objective: "審查目標"
repo: "detabase"
branch: "main"
diff_scope: "變更範圍"
changed_files:               # 相關檔案列表
  - "path/to/file"
acceptance_criteria:         # 驗收標準
  - "條件 1"
test_command: "npm test"     # 測試指令（選填）
risk_level: "LOW / MED / HIGH"
constraints:
  - "read-only sandbox"
  - "not implement"
  - "not approve"
relevant_specs:
  - "specs/path"
boundary_reminder: "Private War Room, Detabase architecture"
ai_advice_loop_note: "AI advice loop belongs to 小馬, not Detabase"
explicit_instruction: "Codex must not approve or implement"
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
  - 問題 2
Suggested next step: ...
Requires 小新 approval: yes/no
```

### 小馬回應模板

```
Codex audit #{job_id} 分析：

✅ 接受 findings:
  • Finding 1: (接受理由)
  • Finding 2: (接受理由)

❌ 不接受:
  • Finding 3: (不接受理由)

修正方案：...
對小新的影響：...

📄 報告已保存: specs/reports/codex-audit-{task_id}.md

下一個批准點：小新是否批准上述方案？
```

---

## 5. Codex Bot Audit-Only 規則

### 允許

| 操作 | 說明 |
|:-----|:------|
| /codex_help | 指令參考 |
| /codex_status | 查 job 狀態 |
| /codex_audit | 執行程式碼審查（read-only） |
| /codex_review | /codex_audit 別名 |
| /codex_cancel | 取消進行中 job |
| read-only sandbox | 唯讀審查 |
| redacted Telegram summary | 遮罩後回覆 |
| report text | 回傳給小馬 |

### 禁止

| 操作 | 原因 |
|:-----|:------|
| implement mode | 不允許實作 |
| workspace-write | 不允許寫入工作區 |
| danger-full-access | 不允許完全存取 |
| 修改 source code | 超出審查範圍 |
| 修改 schema/migration | 資料庫變更需要小新批准 |
| git commit/push | 版本控制操作 |
| 讀取 .env/token/credentials | 敏感資料 |
| 檔案上傳/下載 | 超出範圍 |
| 語音轉寫 | 超出範圍 |
| 模型切換 | 超出範圍 |
| 回覆非作戰室 | 違反邊界 |

---

## 6. 防 Loop 規則

| 規則 | 說明 |
|:-----|:------|
| 同一 task 最多兩輪 audit | Round 3 強制交小新裁決 |
| Round 2 觸發條件 | 需有新 diff、新決策或小新要求 |
| parent_task_link | 防 task_id 繞過兩輪限制 |
| Round 2 仍有 HIGH | 小新選擇：修 / 接受風險 / 降 scope / 停止 |
| Codex 不自動召喚任何人 | 只回應 command |
| 小馬不無限重跑 audit | 同一 task 最多 2 輪 |

---

## 7. 小新批准點

以下事項需要小新明確批准：

- [ ] Phase transition（Phase 1B → 1C）
- [ ] Codex bot 權限變更
- [ ] 新長期服務上線
- [ ] Schema / migration 變更
- [ ] Production 操作
- [ ] 風險接受（High finding 不修）
- [ ] 工作流協議變更

---

*本文件由小馬於 Night Build Window v1 期間產出，基於 context file 與 Phase 1B 討論內容。待小新驗收。*
