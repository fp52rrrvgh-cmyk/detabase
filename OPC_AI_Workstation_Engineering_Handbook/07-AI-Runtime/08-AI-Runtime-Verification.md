# 07-AI-Runtime / 08 AI Runtime 驗收

## 目標

驗證 OPC Runtime 不是只能展示，而是真正具備中斷恢復、權限控制、Evidence、成本與人工審批能力。

## 測試情境一：正常任務

1. 建立 Objective。
2. Planner 產生 task graph。
3. Worker 領取任務。
4. 執行工具。
5. 保存 artifact 與 evidence。
6. Reviewer 驗收。
7. Objective 標記完成。

應確認每一步都有時間、執行者、狀態與 reference。

## 測試情境二：Worker Crash

1. 任務執行中強制停止 worker。
2. 確認 task 留在 pending 或 retryable state。
3. 由另一個 worker 重新取得。
4. 從 checkpoint 恢復。
5. 不重複已完成的副作用。

## 測試情境三：權限拒絕

讓唯讀 Researcher 嘗試修改 repository。

預期：

- Tool Gateway 拒絕。
- Workflow 不把拒絕視為成功。
- Audit log 保存拒絕原因。
- 不會自動提升權限。

## 測試情境四：人工審批

讓 Engineer 嘗試 merge protected branch。

預期：

- Workflow 進入 `waiting_approval`。
- 逾時後採 default-deny。
- 拒絕後不執行 merge。
- 核准後保留 approver 與 approval timestamp。

## 測試情境五：Evidence 不足

Worker 回報完成，但沒有測試結果或 commit SHA。

預期：

- Reviewer 退回。
- Task 不得進入 completed。
- 缺少的 evidence 類型清楚列出。

## 測試情境六：成本上限

任務達到 token、API 或金額上限。

預期：

- 停止新的高成本呼叫。
- 保存目前進度。
- 進入 blocked 或 waiting_decision。
- 報告已花費成本與剩餘工作。

## 最終通過條件

- Objective、Task、Attempt、Tool Call 與 Evidence 可完整追溯。
- Queue 至少一次 delivery 不造成重複副作用。
- Workflow 可從 checkpoint 恢復。
- 未授權工具與路徑被阻擋。
- 高風險操作使用 HITL 與 default-deny。
- Session credential 到期後失效。
- 每個任務可計算模型與工具成本。
- Morning Report 能區分完成、失敗、阻擋與待決策項目。