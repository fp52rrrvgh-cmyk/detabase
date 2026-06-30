# 10-Security-Recovery / 06 Supply-Chain 與 Dependency Security

## 目標

降低套件、Docker image、GitHub Action、VS Code extension、MCP server 與第三方腳本被植入惡意內容的風險。

## 主要來源

- winget packages
- Python packages
- npm / pnpm packages
- Docker images
- GitHub repositories and Actions
- VS Code extensions
- MCP servers
- AI-generated scripts

## 採用原則

- 優先官方來源與維護活躍專案。
- 使用 lock file 與明確版本。
- Docker image 不使用未驗證的 `latest`。
- 第三方 script 先下載、閱讀、保存 checksum，再執行。
- 新工具先在 sandbox 驗證。
- 不讓 Agent 自動採用任意網路依賴。

## Dependency Review

引入新依賴前至少確認：

- 維護者與官方來源
- 最近更新與安全公告
- License
- 安裝時是否執行 script
- 權限與網路需求
- 是否已有用途重疊依賴

## Lock 與 Hash

- Python：`pyproject.toml` 與 lock file。
- Node：`package.json` 與 `pnpm-lock.yaml`。
- Container：固定 image tag；成熟後可固定 digest。
- Bootstrap download：保存 SHA-256。

## GitHub Actions

- 第三方 Action 應固定到可信 commit SHA。
- Workflow 權限預設唯讀。
- Fork PR 不取得 production secrets。
- Release、deploy 與 package publish 需要額外 approval。

## AI 產生程式碼

AI 產生的 shell、PowerShell、SQL 與 migration 必須視為不可信變更：

```text
Review
→ Static checks
→ Sandbox test
→ Human approval when high-risk
→ Execute
```

## 驗收

- 專案依賴皆有 lock file。
- Docker images 使用明確版本。
- 未知安裝腳本不直接執行。
- GitHub Actions 採最小權限。
- 新 MCP server 無法直接取得正式 secrets。