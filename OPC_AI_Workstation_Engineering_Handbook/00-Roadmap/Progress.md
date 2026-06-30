# 工程手冊進度

## 整體進度：60%

依 10 批次規劃計算。

| 批次 | 主題 | 狀態 |
|---|---|---|
| 1 | Foundation + Architecture | 完成 |
| 2 | Windows 11 Engineering | 完成 |
| 3 | Storage & Workspace | 完成 |
| 4 | Development Environment | 完成 |
| 5 | WSL2 + Docker 深入建置 | 完成 |
| 6 | AI Runtime | 完成 |
| 7 | Bootstrap | 待施工 |
| 8 | Operations | 待施工 |
| 9 | Security + Recovery | 待施工 |
| 10 | 整合、ADR、Runbook、最終驗收 | 待施工 |

## 已完成主要內容

- Windows 11 全新安裝、驅動、更新與安全基線
- Services、Registry、Gaming、Power Plan、Terminal
- 雙 SSD、NTFS、Workspace、Junction、備份與 BitLocker
- Git、GitHub CLI、VS Code、Python/uv、Node/pnpm
- WSL2 安裝、systemd、`.wslconfig` 與資源限制
- Windows / Linux 路徑與單一真實來源策略
- Docker Desktop、Compose、Networking、Volume 與 GPU 驗證
- Runtime architecture 與 graph-based workflow
- Redis Streams queue 與 PostgreSQL durable state
- Evidence Layer、Capability Registry 與 Tool Gateway
- MCP 邊界、Agent roles、Session Isolation、HITL 與 default-deny
- AI Runtime failure、cost、approval 與 recovery 驗收

## 下一批

Bootstrap：

- Bootstrap 架構與階段
- Manifest 與 idempotency
- Base applications installer
- Workspace bootstrap
- WSL2 / Docker bootstrap
- Runtime stack bootstrap
- Secrets handoff
- Doctor 與 health checks
- Rollback 與 failure report
- 從全新 Windows 到可工作的端對端驗收
