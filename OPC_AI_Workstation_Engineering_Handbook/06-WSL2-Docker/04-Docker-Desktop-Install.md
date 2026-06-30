# 06-WSL2-Docker / 04 Docker Desktop 安裝與基線

## 目標

在 Windows 11 上使用 Docker Desktop 的 WSL2 backend，提供可重建的 container runtime。

## 安裝前條件

- BIOS 虛擬化已開啟。
- Windows Update 已完成。
- WSL2 正常，Ubuntu 顯示 VERSION 2。
- `.wslconfig` 已採保守值，沒有會讓 Docker 異常的 experimental 設定。
- D 槽與 C 槽都有足夠空間。
- 已讀過 Docker Desktop 授權條款，確認符合個人使用情境。

## 安裝

```powershell
winget install --id Docker.DockerDesktop -e
```

安裝後重新登入或重新開機，再啟動 Docker Desktop。

## 建議設定

- 使用 WSL2 based engine。
- 只啟用主要 Ubuntu distribution 的 integration。
- 不啟用不需要的 Kubernetes。
- 不讓 Docker Desktop 自動啟動高負載 stack。
- 資源限制由 `.wslconfig`、Compose 與 worker 層共同控制。

## 驗證

```powershell
docker version
docker info
docker context ls
docker run --rm hello-world
```

在 Ubuntu 內：

```bash
docker version
```

## WSL2 Integration

在 Docker Desktop 設定中，只對實際使用的 Ubuntu distribution 啟用 integration，避免多個 distribution 同時共享 runtime。

## 資料與 Volume 安全

Docker Desktop Reset、Uninstall、Factory reset、Prune 都可能造成 container、image、volume 或設定遺失。

在任何重設或移除 Docker Desktop 前，必須先執行：

```powershell
docker ps -a
docker volume ls
docker system df
```

若已有資料庫或 Redis volume，先備份：

```powershell
cd D:\OPC\runtime\opc-core
docker compose ps
```

對 PostgreSQL 應優先使用資料庫 dump，不要只複製 volume 檔案。

## 更新策略

- 不在重要任務中途更新 Docker Desktop。
- 更新前 Pause workers。
- 更新前停止 Compose stack 或確認可 checkpoint。
- 更新前備份資料庫。
- 更新後執行 `docker run --rm hello-world`、Compose health check 與 Doctor。

## 禁止事項

- 同時安裝 Docker Desktop 與另一套未知 Windows Docker daemon。
- 在 WSL2 內額外啟動獨立 Docker daemon，卻沒有明確架構需求。
- 對正式資料執行未審查的 prune 指令。
- 未備份 database volume 就重設 Docker Desktop。
- 直接執行 `docker system prune --volumes`。
- Docker 正在寫入資料庫時執行 `wsl --shutdown`。

## 故障時的最小處理順序

```text
確認 Docker Desktop 是否啟動
→ docker context ls
→ wsl -l -v
→ wsl --shutdown 後重開 Docker Desktop
→ 查看 Docker Desktop 診斷
→ 備份資料
→ 才考慮 reset
```

Reset 是最後手段，不是一般修復步驟。

## 驗收

- Docker Desktop 正常啟動。
- `docker run --rm hello-world` 成功。
- Ubuntu 可使用 `docker` 指令。
- Windows 與 WSL2 看到同一個預期 Docker context。
- Docker volume 清單已記錄。
- 重建 container 後測試資料仍存在。
