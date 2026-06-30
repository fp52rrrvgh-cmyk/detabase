# Checklist：第一階段驗收清單

## Windows

- [ ] Windows 11 已完成安裝。
- [ ] Windows Update 已完成。
- [ ] GPU 驅動已安裝。
- [ ] 網路與音訊正常。
- [ ] Steam / 遊戲平台可正常啟動。

## 工具

- [ ] winget 可用。
- [ ] PowerShell 7 可用。
- [ ] Git 可用。
- [ ] GitHub CLI 可用。
- [ ] VS Code 可用。

## WSL2

- [ ] `wsl --version` 正常。
- [ ] Ubuntu 可啟動。
- [ ] Ubuntu 為 WSL2。

## Docker

- [ ] Docker Desktop 可啟動。
- [ ] Docker 使用 WSL2 backend。
- [ ] `docker run hello-world` 成功。

## Workspace

- [ ] `D:\OPC` 已建立。
- [ ] `projects`、`runtime`、`logs`、`artifacts`、`knowledge`、`models` 已建立。
- [ ] Agent prompt 統一指定 `D:\OPC`。

## 安全

- [ ] 沒有把 API key 寫入 Git。
- [ ] `.env.example` 只有 placeholder。
- [ ] Defender 未被整體關閉。
