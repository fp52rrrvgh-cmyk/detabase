# 09-Operations / 04 Logs、Metrics、Traces

## 目標

讓每個 Objective、Task、Agent Session、Tool Call 與錯誤都可追蹤，而不是只存在終端機畫面。

## 三層可觀察性

### Logs

記錄離散事件，例如啟動、錯誤、重試、審批與工具呼叫。

### Metrics

記錄可聚合數值，例如任務數、成功率、延遲、成本、CPU、RAM、GPU 與磁碟。

### Traces

串連一次 Objective 從 Planner 到 Worker、Tool、Reviewer 的完整路徑。

## 必要識別欄位

```text
objective_id
task_id
attempt_id
session_id
trace_id
agent_role
capability_id
```

## Log 等級

- DEBUG：開發與短期排錯
- INFO：正常狀態改變
- WARN：可繼續但需注意
- ERROR：單一任務失敗
- CRITICAL：系統或安全邊界失效

## 必要 Metrics

- objectives_completed_total
- tasks_failed_total
- task_duration_seconds
- queue_depth
- pending_task_age_seconds
- worker_heartbeat_age_seconds
- model_cost_usd
- token_usage_total
- cpu_percent
- memory_used_bytes
- gpu_memory_used_bytes
- disk_free_bytes

## Log 保存

```text
D:\OPC\logs\runtime
D:\OPC\logs\workers
D:\OPC\logs\security
D:\OPC\logs\bootstrap
```

Evidence 與 audit 不應依一般 log retention 自動刪除。

## 脫敏

Log 不得保存完整 token、密碼、Authorization header、cookie、recovery key 或完整 connection string。

## 告警門檻

至少針對：

- Worker heartbeat 消失
- Queue backlog 持續增加
- 磁碟低於 10%
- Database unhealthy
- 重試率異常
- 成本超過預算
- 未授權工具呼叫

## 驗收

- 任一 failed task 可由 trace 找到所有相關事件。
- Metrics 能產生日報。
- Log 中沒有明文 secrets。
- 告警能指出具體 Objective 或服務。