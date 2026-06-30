# ADR-0003：PostgreSQL 作為 Durable State，Redis Streams 作為 Queue

## 狀態

Accepted

## 背景

OPC 需要可恢復的 workflow state、可追蹤的 task attempt、queue delivery、evidence 與成本紀錄。單靠記憶體、聊天紀錄或 Redis 都不足以成為長期真實來源。

## 決策

- PostgreSQL 保存 Objective、Workflow、Task、Attempt、Approval、Decision、Evidence metadata 與成本。
- Redis Streams 負責 ready queue、retry、consumer group、pending task 與 event delivery。
- Artifact 實體檔案存於 Artifact Store 或 `D:\OPC\artifacts`。
- Queue ACK 必須在 durable state 寫入成功後執行。

## 理由

- PostgreSQL 提供交易、關聯、查詢與長期持久化。
- Redis Streams 提供低延遲、consumer group、pending 與重新領取能力。
- 分離 queue 與 durable state 可避免將短期傳遞系統誤作唯一真實來源。

## 代價

- 需要處理 queue 與 database 的一致性。
- Worker 必須具備 idempotency。
- Operations 與 backup 複雜度增加。

## 驗證

- Worker crash 後任務可重新領取。
- 重複 delivery 不重複產生副作用。
- PostgreSQL 可重建 queue 狀態或辨識分歧。
- Database backup 可還原 Objective 與 Evidence metadata。