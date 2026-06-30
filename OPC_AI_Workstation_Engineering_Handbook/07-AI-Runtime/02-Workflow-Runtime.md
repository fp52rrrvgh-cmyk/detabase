# 07-AI-Runtime / 02 Workflow Runtime

## 目標

把複雜任務表示成可暫停、可恢復、可重試、可審批的狀態圖，而不是單次長對話。

## 採用方向

OPC 採用 graph-based workflow runtime。第一候選為 LangGraph 類型的狀態圖框架；是否最終採用，需以持久化、重試、人工節點、可觀察性與部署複雜度驗證。

## 基本狀態

```text
created
→ planned
→ queued
→ running
→ waiting_approval
→ reviewing
→ completed
```

失敗分支：

```text
running
→ retryable_failed
→ queued
```

或：

```text
running
→ blocked
→ human_decision
```

## 每個節點必須定義

- 輸入 schema
- 輸出 schema
- 可使用能力
- 最大執行時間
- 最大重試次數
- 成本上限
- 成功條件
- 失敗分類
- Evidence 要求

## Checkpoint

每個重要節點完成後保存：

- workflow id
- objective id
- current node
- state payload
- artifact references
- tool call references
- model usage
- timestamp

## 重試規則

可重試：

- 暫時性網路錯誤
- rate limit
- 服務短暫不可用
- worker crash

不可盲目重試：

- 權限不足
- 驗收條件不成立
- schema 錯誤
- destructive action 被拒絕
- 預算耗盡

## Human-in-the-loop

以下情境預設等待人工：

- 刪除資料
- merge 到受保護分支
- 發布 production
- 寄送外部郵件
- 花費超過門檻
- 修改 secrets 或權限
- 需求存在重大歧義

## 驗收

- 關閉 worker 後可從 checkpoint 恢復。
- 重試不會重複執行已成功的 destructive step。
- 人工節點逾時後採 default-deny。
- workflow state 可由 CLI 或 dashboard 查詢。