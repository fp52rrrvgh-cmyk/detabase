# 10-Security-Recovery / 08 Disaster Recovery Tiers

## 目標

依事件嚴重程度選擇最小必要復原方式，避免小問題直接重灌，也避免重大損壞只靠重啟處理。

## Tier 0：單一程序或 Worker

適用：

- Worker crash
- 單一 tool timeout
- 單一 session 污染

處理：

- 隔離 session
- 撤銷 credential
- 從 checkpoint 重試
- 不影響其他服務

## Tier 1：單一服務

適用：

- Redis、PostgreSQL、Runtime API 或特定 Compose service 失敗

處理：

- Pause dispatch
- 保存 log
- 重啟單一服務
- 驗證 durable state
- 執行 smoke test

## Tier 2：Runtime Stack

適用：

- 多個 container 或 WSL2 runtime 異常
- Queue 與 database 狀態不一致

處理：

- Stop workers
- 備份可讀資料
- 重建 container，不刪除 volume
- 還原 database dump（必要時）
- 執行 Doctor 與 runtime verification

## Tier 3：Windows Host

適用：

- Windows 系統損壞
- WSL2 / Docker 長期不可恢復
- 系統碟故障但資料碟可用

處理：

- 保存 D:\OPC 與外部備份
- 重裝 Windows
- 執行 Bootstrap
- 還原 secrets references 與 runtime data
- 執行端對端驗收

## Tier 4：整機或雙磁碟災難

適用：

- 電腦遺失、火災、勒索軟體、兩顆 SSD 同時故障

處理：

- 使用異地備份與 Recovery Package
- 在替代硬體執行 Bare-metal Rebuild
- 輪替所有可能暴露的 credentials
- 驗證資料完整性與事件影響

## RPO 與 RTO

- RPO：最多可接受遺失多少資料時間。
- RTO：最多可接受停機多久。

建議初始目標：

```text
Git / Handbook RPO: 接近 0（持續 push）
Operational database RPO: 24 小時內
Critical secrets recovery RPO: 0
Workstation RTO: 1 個工作日內
```

## 驗收

- 每個 Tier 都有 owner、Runbook 與備份來源。
- 不同 Tier 的復原演練有紀錄。
- RPO / RTO 與實際備份頻率一致。
- Tier 4 不依賴原電腦才能取得 Recovery Package。