# 11-Final / 03 Full-System Acceptance

## 使用方式

此清單不是閱讀清單，而是實機驗收清單。每一項必須保存 Evidence。

## Windows Host

- [ ] Windows 11 已更新
- [ ] Secure Boot 與 TPM 正常
- [ ] GPU、網路、音訊驅動正常
- [ ] Defender 與 Firewall 啟用
- [ ] 遊戲與反作弊正常

## Storage

- [ ] C: 與 D: 為獨立 SSD
- [ ] D: 為 NTFS、標籤 OPC-DATA
- [ ] `D:\OPC` 標準目錄完整
- [ ] 沒有未預期的跨碟磁碟區
- [ ] 重要資料有異地備份

## Development

- [ ] Git、GitHub CLI、VS Code 正常
- [ ] Python / uv 可重建環境
- [ ] Node / pnpm 可重建環境
- [ ] Repository 不含 secrets

## WSL2 與 Docker

- [ ] Ubuntu 使用 WSL2
- [ ] systemd 正常
- [ ] `.wslconfig` 符合硬體
- [ ] Docker Desktop 使用 WSL2 backend
- [ ] Compose、volume、network 正常
- [ ] NVIDIA GPU 可由 Windows、WSL2、Container 驗證

## AI Runtime

- [ ] PostgreSQL durable state 正常
- [ ] Redis Streams queue 正常
- [ ] Workflow 可 checkpoint 與 resume
- [ ] Capability Registry 與 Tool Gateway 生效
- [ ] Agent Session 隔離生效
- [ ] Evidence 與成本可追蹤
- [ ] HITL 與 default-deny 生效

## Bootstrap

- [ ] Manifest 可解析
- [ ] Bootstrap 可重跑
- [ ] 中斷後可 Resume
- [ ] Failure report 正常
- [ ] Doctor 產生 JSON 與 Markdown

## Operations

- [ ] 夜間 Objective 可無人監看執行
- [ ] Morning Report 可於 5 分鐘內理解
- [ ] Pause、Resume、Stop 正常
- [ ] Metrics、Logs、Traces 可查詢
- [ ] 成本與資源上限實際阻擋
- [ ] 備份已測試還原

## Security 與 Recovery

- [ ] 未授權工具與路徑會被拒絕
- [ ] Secrets 可輪替與撤銷
- [ ] Restricted data 不進一般 Log
- [ ] 網路服務沒有意外暴露
- [ ] Supply-chain policy 生效
- [ ] Tier 2 Recovery 已演練
- [ ] Bare-metal Rebuild 已在測試環境驗證

## 最終測試 Objective

建立一個唯讀測試 Objective：

```text
讀取指定 repository，產生摘要與風險清單，保存 artifact、checksum、成本與 reviewer 結果，不修改 repository。
```

通過條件：

- Objective 到 Evidence 全鏈路可追蹤
- 無未授權 side effect
- Morning Report 正確
- Doctor 無 FAIL

## 簽核

```text
驗收日期：
Manifest version：
Handbook commit：
Doctor report：
Evidence directory：
驗收人：
結果：PASS / CONDITIONAL / FAIL
```
