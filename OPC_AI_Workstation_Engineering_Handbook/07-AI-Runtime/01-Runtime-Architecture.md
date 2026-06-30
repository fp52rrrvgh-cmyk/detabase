# 07-AI-Runtime / 01 Runtime Architecture

## 目標

建立一套「目標進入、任務分解、Agent 執行、證據保存、人工驗收」的可控執行層，而不是把多個聊天機器人拼在一起。

## 核心資料流

```text
Objective
  ↓
Planner
  ↓
Workflow Runtime
  ↓
Task Queue
  ↓
Specialized Worker
  ↓
Tool / MCP / Repository / Database
  ↓
Evidence Store
  ↓
Reviewer
  ↓
Morning Report / Human Decision
```

## 核心元件

1. **Objective Store**：保存目標、限制、預算、驗收條件。
2. **Workflow Runtime**：控制狀態轉移、重試、暫停、恢復與人工節點。
3. **Queue**：分派工作、避免同一任務重複執行。
4. **Capability Registry**：記錄每個 Agent 可做什麼、需要哪些權限。
5. **Session Isolation**：每個任務擁有獨立 workspace、credential scope 與 log。
6. **Evidence Layer**：保存 commit、測試、截圖、查詢結果與失敗紀錄。
7. **Reviewer**：根據驗收標準判定通過、退回或要求人工決策。

## OPC 採用原則

- Objective-first，不以聊天對話作為任務真實來源。
- Evidence-first，沒有驗證資料不得標示完成。
- Timeline-first，所有狀態改變必須有時間與原因。
- Failure-preserved，失敗不可只留在 terminal 畫面。
- Default-deny，未註冊能力與權限一律拒絕。
- Human-in-the-loop，只在高風險或決策點中斷人工。

## ChatGPT 的位置

ChatGPT 可協助架構研究、設計與外部審查，但不視為 OPC runtime 內的常駐 worker。正式 runtime 必須由可觀察、可重啟、可限制權限的本機或服務端程序承載。

## 最小可運作拓撲

```text
API / CLI
├─ PostgreSQL
├─ Redis Streams
├─ Workflow Worker
├─ Specialized Workers
└─ Evidence Artifact Store
```

## 通過條件

- 任務可中斷後恢復。
- 同一任務不會無限制重複執行。
- 每次工具呼叫可追蹤到 objective 與 task。
- 失敗、成本與產物有完整紀錄。
- 高風險操作必須經過審批。