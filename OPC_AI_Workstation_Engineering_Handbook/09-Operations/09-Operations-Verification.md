# 09-Operations / 09 Operations 驗收

## 目標

驗證 OPC 能穩定完成夜間自主執行、早晨驗收、暫停恢復、監控、備份、維護與事故處理。

## 測試一：夜間 Objective

提交一個低風險 Objective，設定明確 success criteria、deadline 與 budget。

預期：

- Planner 建立 task graph。
- Worker 在隔離 session 執行。
- Reviewer 根據 evidence 驗收。
- Morning Report 正確呈現結果。

## 測試二：Pause / Resume

1. 啟動多個可中斷任務。
2. 執行 Pause。
3. 確認不再領取新任務。
4. Resume 後恢復 dispatch。

不得重複執行已完成副作用。

## 測試三：資源與預算上限

故意將 Task budget 設低。

預期：

- 80% 時產生警告。
- 100% 時停止新高成本呼叫。
- 保存 checkpoint。
- Morning Report 顯示成本與剩餘工作。

## 測試四：監控與告警

模擬：

- Worker heartbeat 消失
- Disk free 低於門檻
- Queue backlog 增加
- Database unhealthy

確認告警包含服務、Objective、時間與 remediation。

## 測試五：備份與還原

- 建立 PostgreSQL dump。
- 產生 checksum 與 manifest。
- 複製到外部位置。
- 還原到測試資料庫。
- 驗證 schema 與測試資料。

## 測試六：維護窗口

執行 Pause、備份、更新、重開機、Doctor、smoke test、Resume 的完整流程。

## 測試七：Incident

模擬未授權工具呼叫：

- Tool Gateway 阻擋。
- 建立 security event。
- 隔離 session。
- 撤銷 credential。
- 保存 evidence。

## 最終通過條件

- 夜間任務可無人監看安全執行。
- Morning Report 可在 5 分鐘內完成驗收。
- Pause、Resume、Stop 不破壞 durable state。
- Logs、Metrics、Traces 可追蹤失敗。
- 備份已成功測試還原。
- 更新後才在 Doctor 通過時恢復營運。
- 預算與資源上限實際生效。
- Incident Response 可完成止血、恢復與 postmortem。