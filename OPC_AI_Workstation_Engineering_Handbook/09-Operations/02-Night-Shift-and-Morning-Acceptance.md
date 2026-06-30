# 09-Operations / 02 夜間執行與早晨驗收

## 目標

建立可在無人監看的夜間安全執行、並在早晨提供高密度驗收資訊的標準流程。

## 夜間開始前

系統必須確認：

- Objective schema 完整
- 權限與 Capability 已核准
- 預算與截止時間存在
- 工作站電源與磁碟空間足夠
- Docker、PostgreSQL、Redis 健康
- 沒有等待人工的高風險步驟

## 夜間執行規則

- 優先執行低風險、可重試、可中斷任務。
- 高風險步驟進入 `waiting_approval`，不得自行通過。
- 每個任務限制 CPU、RAM、GPU、時間與成本。
- 失敗超過重試次數後進 dead-letter 或 blocked。
- 每個重要節點保存 checkpoint。

## Morning Report 內容

```text
Executive Summary
Completed Objectives
Partial Results
Blocked Decisions
Failed Tasks
Cost Summary
Resource Summary
Evidence Links
Recommended CEO Actions
```

## 報告原則

- 先顯示需要 CEO 決策的項目。
- 不用長篇模型輸出取代結論。
- 每個完成項目都附 evidence reference。
- 每個失敗項目都附失敗分類與下一步。
- 明確標示哪些事項沒有執行。

## 早晨驗收動作

CEO 可選：

- Accept
- Reject
- Request changes
- Approve blocked action
- Cancel objective
- Increase budget or deadline

每個決策都寫入 Decision Log。

## 驗收

- 夜間執行不需要持續人工操作。
- 遇到高風險動作時會安全停住。
- Morning Report 可在 5 分鐘內理解。
- 所有結論都能追溯到 evidence。