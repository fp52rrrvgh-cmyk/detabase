# 工程手冊進度

## 整體進度：100%

依 10 批次規劃計算。

| 批次 | 主題 | 狀態 |
|---|---|---|
| 1 | Foundation + Architecture | 完成 |
| 2 | Windows 11 Engineering | 完成 |
| 3 | Storage & Workspace | 完成 |
| 4 | Development Environment | 完成 |
| 5 | WSL2 + Docker 深入建置 | 完成 |
| 6 | AI Runtime | 完成 |
| 7 | Bootstrap | 完成 |
| 8 | Operations | 完成 |
| 9 | Security + Recovery | 完成 |
| 10 | 整合、ADR、Runbook、最終驗收 | 完成 |

## 已完成主要內容

- Windows 11 全新安裝、驅動、更新與安全基線
- Services、Registry、Gaming、Power Plan、Terminal
- 雙 SSD、NTFS、Workspace、Junction、備份與 BitLocker
- Git、GitHub CLI、VS Code、Python/uv、Node/pnpm
- WSL2 安裝、systemd、`.wslconfig` 與資源限制
- Windows / Linux 路徑與單一真實來源策略
- Docker Desktop、Compose、Networking、Volume 與 GPU 驗證
- Runtime architecture、graph-based workflow、Redis Streams、PostgreSQL
- Evidence Layer、Capability Registry、MCP、Session Isolation 與 HITL
- Bootstrap phases、Manifest、idempotency、Doctor、rollback 與端對端驗收
- Daily operating model、夜間自主執行、早晨驗收與事故處理
- Threat Model、Least Privilege、Secrets、Sandbox 與 Network Security
- Supply-chain、Data Classification、Disaster Recovery 與 Bare-metal Rebuild
- Master Index、Final Architecture、ADR、Runbook、Scripts 與 Templates
- Full-System Acceptance 與 Completion Record

## 文件狀態

工程手冊 10 批次建置完成。

這個 100% 代表文件、架構、操作程序、範本與基礎腳本已完成；不代表實體工作站已通過驗收。實機仍須依 `11-Final/03-Full-System-Acceptance.md` 施工、執行 Doctor、測試備份還原，並完成最終簽核。

## 下一階段

```text
實機 Windows 11 全新安裝
→ 依手冊施工
→ 執行 Bootstrap
→ 執行 verify-all.ps1
→ 修正所有 FAIL
→ 完成 Full-System Acceptance
→ OPC AI Workstation Ready
```
