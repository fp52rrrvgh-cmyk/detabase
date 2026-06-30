# 07-AI-Runtime / 03 Redis Streams Queue

## 目標

建立可追蹤、可重送、可分組消費的任務佇列，避免任務只存在記憶體或聊天室。

## 採用方向

Redis Streams 作為第一階段 task queue 與 event bus。PostgreSQL 保存長期真實狀態，Redis 不作為唯一真實來源。

## Stream 規劃

```text
opc:tasks:ready
opc:tasks:retry
opc:events
opc:dead-letter
```

Consumer Group：

```text
planner-workers
coding-workers
research-workers
review-workers
```

## 任務欄位

```json
{
  "task_id": "tsk_...",
  "objective_id": "obj_...",
  "capability": "repository.patch",
  "priority": 50,
  "attempt": 0,
  "max_attempts": 3,
  "deadline": "ISO-8601",
  "payload_ref": "postgres://...",
  "trace_id": "trc_..."
}
```

Queue 只保存必要路由資料；大型 prompt、artifact 與完整 state 應存 PostgreSQL 或 artifact store。

## 消費流程

```text
XREADGROUP
→ claim task
→ 建立 execution record
→ 執行
→ 保存 evidence
→ 更新 PostgreSQL state
→ XACK
```

只有在 durable state 已成功寫入後才能 ACK。

## Pending 與重領

Worker crash 後，任務會停留在 Pending Entries List。Reaper 依 idle time 檢查並轉交其他 worker，但必須先確認操作是否具 idempotency。

## Dead Letter Queue

超過重試次數、schema 無效、權限永久不足或人工拒絕的任務，移入 `opc:dead-letter`，並保留：

- 原始 task id
- 最後錯誤
- 所有 attempt
- evidence references
- 人工處理狀態

## 驗收

- Worker crash 後任務可被重新領取。
- ACK 前已完成 durable state 寫入。
- 重複 delivery 不會重複產生副作用。
- Dead letter 可被人工查詢與重新排程。