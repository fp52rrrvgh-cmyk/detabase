# 09-Operations / 03 Start、Stop、Pause、Resume

## 目標

建立一致的營運控制介面，避免直接關閉視窗、強制結束程序或隨意執行 `wsl --shutdown` 造成任務與資料損壞。

## 四種控制語意

### Start

啟動 runtime control plane、queue、workers 與必要服務。

### Stop

有序停止接收新任務，等待執行中工作完成或 checkpoint 後關閉。

### Pause

停止分派新任務，但保留 runtime 與 durable state。適合遊戲、維護或人工檢查。

### Resume

恢復 queue dispatch，重新檢查 blocked、pending 與 expired lease。

## 建議控制順序

### Start

```text
Docker Desktop
→ PostgreSQL / Redis
→ Runtime API
→ Queue workers
→ Scheduler
→ Health verification
```

### Stop

```text
停止接收 Objective
→ Pause dispatch
→ 等待或 checkpoint running tasks
→ 停止 workers
→ 停止 runtime API
→ 備份 durable state
→ 停止 Compose stack
```

## 遊戲模式

```text
Pause workers
→ 確認 GPU / CPU 高負載任務停止
→ 保留 PostgreSQL 與 Redis 或依需求停止
→ 啟動遊戲
→ 遊戲結束後執行 Doctor
→ Resume workers
```

## 強制停止條件

只有在以下情境才可強制終止：

- Worker 無回應且超過 hard timeout
- 資源失控威脅系統穩定
- 安全事件
- 任務已明確標記可中斷

強制停止後必須保存 crash evidence 與 lease 狀態。

## 驗收

- Pause 後不再領取新任務。
- Running task 可完成或 checkpoint。
- Resume 不會重複執行已完成副作用。
- Stop 後 durable state 保留。
- 遊戲模式不破壞 runtime。