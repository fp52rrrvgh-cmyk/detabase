# 06-WSL2-Docker / 09 驗收清單

## WSL2

```powershell
wsl --status
wsl --version
wsl -l -v
```

Ubuntu 必須顯示 VERSION 2。

在 Ubuntu：

```bash
uname -a
cat /etc/os-release
systemctl is-system-running
nproc
free -h
```

## 路徑

確認：

- Windows 根目錄為 `D:\OPC`
- WSL2 對應路徑為 `/mnt/d/OPC`
- 每個 repository 只有一個主要位置
- 沒有 root-owned 專案檔案

## Docker

```powershell
docker version
docker info
docker context ls
docker run --rm hello-world
```

## Compose

```powershell
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail 50
```

確認 service 正常、healthcheck 通過、重建 container 後資料仍存在。

## Networking

```powershell
Get-NetTCPConnection -State Listen
Test-NetConnection localhost -Port <PORT>
```

確認只有必要 port 對外發布。

## GPU

若使用 NVIDIA：

```powershell
nvidia-smi
```

在 WSL2：

```bash
nvidia-smi
```

再使用已驗證的 CUDA image 測試 GPU container。

## 資源

確認：

- Windows 保有足夠 RAM
- WSL2 CPU 與 RAM 上限符合硬體
- 遊戲時可安全停止高負載 workload
- Docker 不會吃滿磁碟

## 通過條件

只有當 WSL2、Docker、Compose、Networking、Volume、GPU 與資源限制全部通過，第 5 批才算完成。