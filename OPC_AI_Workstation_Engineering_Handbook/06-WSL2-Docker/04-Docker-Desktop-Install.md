# 06-WSL2-Docker / 04 Docker Desktop 安裝與基線

## 目標
在 Windows 11 上使用 Docker Desktop 的 WSL2 backend，提供可重建的 container runtime。

## 安裝前條件

- BIOS 虛擬化已開啟
- WSL2 正常
- Ubuntu 顯示 VERSION 2
- Windows Update 已完成

## 安裝

```powershell
winget install --id Docker.DockerDesktop -e
```

安裝後重新登入或重新開機，再啟動 Docker Desktop。

## 建議設定

- 使用 WSL2 based engine
- 啟用對主要 Ubuntu distribution 的 integration
- 不啟用不需要的 Kubernetes
- 不讓 Docker Desktop 自動啟動高負載 stack
- 資源限制由 `.wslconfig` 與 workload 層共同控制

## 驗證

```powershell
docker version
docker info
docker context ls
docker run --rm hello-world
```

## WSL2 Integration
在 Docker Desktop 設定中，只對實際使用的 Ubuntu distribution 啟用 integration，避免多個 distribution 同時共享 runtime。

## 更新策略

- 不在重要任務中途更新 Docker Desktop
- 更新前停止 Compose stack
- 備份資料庫
- 更新後執行驗收

## 禁止事項

- 同時安裝 Docker Desktop 與另一套未知 Windows Docker daemon
- 在 WSL2 內額外啟動獨立 Docker daemon，卻沒有明確架構需求
- 對正式資料執行未審查的 prune 指令
- 未備份 database volume 就重設 Docker Desktop

## 驗收

- Docker Desktop 正常啟動
- `docker run --rm hello-world` 成功
- Ubuntu 可使用 `docker` 指令
- Windows 與 WSL2 看到同一個預期 Docker context
