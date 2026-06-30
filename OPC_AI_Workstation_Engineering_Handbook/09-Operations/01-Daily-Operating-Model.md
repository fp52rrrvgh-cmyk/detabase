# 09-Operations / 01 日常營運模型

## 目標

把 OPC 從「工具集合」轉成可每天運作的公司作業系統：晚上交代任務，夜間自主執行，早上只處理驗收與決策。

## 每日循環

```text
晚上：CEO 提交 Objective
→ 系統驗證限制與驗收條件
→ Planner 建立 task graph
→ Workers 執行
→ Reviewer 驗收
→ Morning Report 彙整
→ CEO 早上決策、接受、退回或調整
```

## CEO 只負責

- 定義 Objective
- 指定限制、預算與截止時間
- 決定高風險事項
- 驗收結果
- 調整方向

## 系統負責

- 任務拆解
- 排程與分派
- 權限與能力檢查
- 執行與重試
- Evidence 保存
- 成本與資源紀錄
- 失敗分類
- 報告產生

## Objective 最小格式

```yaml
objective: 修正 trip-report-system 的查詢錯誤
success_criteria:
  - 測試通過
  - 產生 commit
  - 保留查詢證據
constraints:
  - 不修改 production
  - 不 merge main
budget:
  max_cost_usd: 10
deadline: 2026-07-01T06:00:00+08:00
```

## 狀態分類

- `completed`：驗收通過且 evidence 完整
- `failed`：已停止，原因明確
- `blocked`：缺少決策、權限或外部依賴
- `waiting_approval`：等待人工批准
- `partial`：部分成果可用，但未達完整標準

## 原則

- 不用聊天中的「看起來完成」取代 durable state。
- 不因夜間無人監看而自動放寬權限。
- 不把所有失敗都重試到早上。
- 不讓單一任務拖垮整台工作站。

## 驗收

- 每個 Objective 都有 owner、deadline、budget 與 success criteria。
- 早晨報告能清楚區分完成、失敗、阻擋與待決策。
- CEO 不需要逐步指揮 worker。