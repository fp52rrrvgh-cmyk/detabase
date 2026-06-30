# 09-Operations / 07 成本與資源治理

## 目標

讓每個 Objective、Task、Agent 與模型都有可追蹤成本與資源上限，避免夜間任務失控消耗 API、CPU、RAM、GPU 或磁碟。

## 成本維度

- 模型 token 與 API 金額
- 外部搜尋或工具費用
- CPU time
- RAM peak
- GPU time 與 VRAM peak
- Storage growth
- Human review time

## 預算層級

```text
Company monthly budget
→ Project budget
→ Objective budget
→ Task budget
→ Attempt budget
```

下層不得超過上層剩餘額度。

## 執行前檢查

- 預估模型與工具成本
- 預估最長執行時間
- 是否需要 GPU
- 是否可改用較低成本模型
- 是否已有可重用結果或快取

## 執行中控制

達到 80% 預算時警告；達到 100% 時停止新的高成本呼叫，保存 checkpoint，轉為 `waiting_decision` 或 `blocked`。

## 模型路由

- 低風險分類、格式化：低成本模型
- 程式與複雜推理：高能力模型
- Reviewer：可使用不同模型或獨立驗證工具
- 不因單一模型方便而讓所有任務都使用最高成本方案

## 資源治理

每個 worker 應有：

- concurrency limit
- timeout
- memory limit
- CPU quota
- GPU allocation
- disk quota

## 報表

Morning Report 至少顯示：

- 昨夜總成本
- 各 Objective 成本
- 失敗重試浪費
- 高成本但未完成項目
- 模型與工具使用分布

## 驗收

- 任一 API 費用可追溯到 Objective。
- 超過預算會停止，而不是只發警告。
- Worker 無法自行提高 budget。
- 成本與資源資料可被每日與每月彙整。