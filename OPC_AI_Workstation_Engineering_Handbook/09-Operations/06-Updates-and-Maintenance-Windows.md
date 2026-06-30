# 09-Operations / 06 更新與維護窗口

## 目標

讓 Windows、WSL2、Docker、runtime images、套件與模型更新有固定程序，不在夜間任務中途造成不可預期中斷。

## 維護窗口

建議每週安排一次人工維護窗口：

```text
停止接收新 Objective
→ Pause workers
→ 等待或 checkpoint running tasks
→ 建立備份
→ 更新系統與套件
→ 重開機
→ 執行 Doctor
→ 執行 smoke test
→ Resume workers
```

## 更新分類

### 安全更新

優先處理，但仍需在可控窗口執行。

### 一般套件更新

集中批次更新，避免每個 Agent 自行升級依賴。

### Major Version

需要獨立變更單、相容性測試與 rollback plan。

### Model 更新

需比較品質、成本、延遲、工具能力與安全行為，不因版本較新就直接替換。

## 變更前紀錄

至少保存：

- 目前版本
- 目標版本
- 影響服務
- 備份 reference
- Rollback 方法
- 驗收清單

## 變更後驗證

```text
Windows / WSL2 / Docker version
Compose health
Database connectivity
Queue publish and consume
Agent test task
GitHub tool access
GPU test
Morning Report generation
```

## 禁止事項

- 夜間自動升級核心 runtime
- 未備份就執行 database migration
- 同時更新多個重大元件而無法定位問題
- 更新後跳過 Doctor
- 讓不同 worker 自行決定依賴版本

## 驗收

- 維護過程有變更紀錄。
- 更新失敗可回復。
- Doctor 與 smoke test 通過後才恢復服務。
- 重大變更有 ADR 或 change record。