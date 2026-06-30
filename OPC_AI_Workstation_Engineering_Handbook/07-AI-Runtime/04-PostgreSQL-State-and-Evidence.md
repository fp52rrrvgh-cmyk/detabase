# 07-AI-Runtime / 04 PostgreSQL State 與 Evidence

## 目標

以 PostgreSQL 保存長期真實狀態，讓 objective、task、execution、decision、artifact 與成本可查詢、可稽核。

## 核心資料表

```text
objectives
workflow_runs
tasks
task_attempts
agent_sessions
tool_calls
artifacts
evidence
approvals
decisions
model_usage
```

## 邊界

- PostgreSQL：權威狀態、關聯、查詢、audit metadata。
- Redis：短期 queue、event delivery、lease。
- Artifact store：大型檔案、報告、測試輸出、截圖。
- Git：程式碼、文件、ADR、可版本控制設定。

## Evidence 最小欄位

```text
evidence_id
objective_id
task_id
attempt_id
type
uri
sha256
created_at
producer
verification_status
```

## 完成規則

Task 不可只因 Agent 回覆「完成」而變成 completed。至少需要：

- 成功條件已滿足
- 必要 evidence 已保存
- Reviewer 結果通過
- destructive action 有 approval reference

## 交易一致性

更新 task 狀態、寫入 evidence metadata、記錄成本等應使用 database transaction。Queue ACK 必須發生在交易成功後。

## 不保存的內容

- plaintext secret
- 不必要的完整 prompt 私密資料
- 可由 artifact reference 取得的大型 binary
- 無限制的 model raw output

## 驗收

- 任一完成任務可追溯到 objective。
- 任一 tool call 可追溯到 agent session 與權限。
- Artifact 有 checksum。
- 任務狀態與 queue delivery 不會永久分歧。
- 可產生每日執行與成本報表。