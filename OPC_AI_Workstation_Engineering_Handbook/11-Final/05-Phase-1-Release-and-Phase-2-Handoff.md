# 11-Final / 05 Phase 1 Release and Phase 2 Handoff

## 目的

本文件是 Phase 1 與未來 Phase 2 之間唯一的交接點。

它不設計 Agent Runtime，也不提前選定 LangGraph、Hermes、Codex、OpenHands 或其他框架；它只定義 Phase 1 何時完成、哪些證據必須交接，以及 Phase 2 何時才可以開始規劃。

---

## Phase 1 Release Gate

以下全部成立才可發布 Phase 1：

- [ ] 已依 `11-Final/01-Master-Index.md` 完成實機重灌。
- [ ] `scripts/verify-all.ps1` 沒有 FAIL。
- [ ] Full-System Acceptance 已簽核為 PASS。
- [ ] PostgreSQL dump 已還原到隔離測試資料庫。
- [ ] WSL export 已用測試名稱 import 並成功啟動。
- [ ] BitLocker recovery key 與 Key ID 已核對。
- [ ] 外部備份 checksum 正確。
- [ ] Windows、WSL2、Docker、PostgreSQL、Redis 沒有未處理 blocker。
- [ ] 實機施工期間遇到的未記錄步驟已回填手冊。
- [ ] 使用的 Handbook commit SHA 已保存。

Release 判定：

```text
PASS / OPC AI WORKSTATION PHASE 1 READY
```

---

## Phase 1 Release Package

封版時至少保存：

```text
Handbook repository URL
Handbook commit SHA
Windows build
SSD 型號 / 序號末碼 / 容量
D: Volume UniqueId
Bootstrap state.json
Bootstrap log
verify-all JSON
verify-all Markdown
BitLocker Key ID 核對紀錄（不含完整 recovery key）
WSL export SHA-256
PostgreSQL dump SHA-256
Recovery rehearsal 紀錄
已接受 WARN / SKIP 清單
```

完整 recovery key、token、password、`.env` 不得進入 Release Package。

---

## 穩定觀察期

Phase 1 PASS 後，不建議立刻改造成 Autonomous Runtime。

先完成一段實際使用觀察，確認：

- Windows 不會因睡眠、更新或驅動問題中斷工作。
- WSL2 可穩定啟動與關閉。
- Docker Desktop 不會反覆失聯。
- PostgreSQL / Redis 重啟後健康。
- D:\OPC 工作區權限與路徑穩定。
- Git、Python、Node 開發環境可正常重建。
- 備份與驗收報告能被重新找到。

觀察期內出現的問題仍屬 Phase 1，必須先修正，不得丟給 Phase 2 解決。

---

## Phase 2 Planning Gate

Phase 2 只有在以下條件全部成立後才能開始：

1. Phase 1 實機 PASS。
2. 穩定觀察期沒有未解 blocker。
3. Recovery rehearsal 通過。
4. Phase 1 Release Package 完整。
5. 使用者明確決定開始 Phase 2。

通過後：

```text
Phase 2 Planning Status: READY TO PLAN
```

未通過前：

```text
Phase 2 Planning Status: BLOCKED
```

---

## Phase 2 應獨立建立

未來建議建立：

```text
OPC_Agent_Runtime_Engineering_Handbook/
```

其範圍才包含：

- Objective intake / reframe
- Workflow orchestration
- Checkpoint / resume
- Queue / retry / deduplication
- Capability Registry
- Tool / MCP Gateway
- Agent identity / workspace / credential isolation
- Evidence Layer
- Reviewer
- HITL approval
- Morning Report
- Feedback loop
- Cost / quota / timeout / fallback
- Observability / audit

Phase 2 規劃時應重新研究當時主流框架與安全實務，不把 Phase 1 撰寫時的工具選型當成永久決策。

---

## Agent 數量與分工原則

Phase 2 不以「Agent 越多越好」為原則。

先定義：

```text
角色
→ 權限
→ 輸入
→ 輸出
→ 完成條件
→ Evidence
→ 失敗與升級路徑
```

再決定由哪個模型或 Agent 工具執行。

Orchestrator、Queue、Database、Gateway、CI 並不一定是 Agent；它們通常是 Runtime 元件。

---

## 明確排除

Repository root 的：

```text
spec-phase2.md
```

內容是財務系統的固定訂閱、帳戶對帳與智慧提醒規格。

它不是：

- OPC Agent Runtime 藍圖
- v3 Agent 架構
- Phase 2 施工入口

不得搬入本手冊，也不得作為 Phase 2 的唯一真實來源。

---

## 目前 Checkpoint

```text
Phase 1 Handbook: COMPLETE
Phase 1 CI Audit: PASS
Phase 1 Bare-Metal Validation: PENDING
Phase 1 Release: NOT YET SIGNED
Phase 2 Planning: BLOCKED
```

下一步：

```text
依 Master Index 執行真實重灌
→ 保存 evidence
→ 修正現場差異
→ Full-System Acceptance PASS
→ 簽署 Phase 1 Release
```
