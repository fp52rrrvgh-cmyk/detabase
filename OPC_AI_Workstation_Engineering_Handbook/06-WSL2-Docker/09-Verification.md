# 06-WSL2-Docker / 09 驗收清單

## 使用方式

先確認 Windows 與 Storage 已通過，再逐步驗收 WSL2、Docker、Compose、網路與資料持久化。

## Step 1：WSL2 狀態

PowerShell：

```powershell
wsl --status
wsl --version
wsl -l -v
```

通過條件：

- [ ] `wsl --version` 可執行。
- [ ] Ubuntu 存在。
- [ ] Ubuntu VERSION 是 2。

## Step 2：Ubuntu 基礎

在 Ubuntu：

```bash
uname -a
cat /etc/os-release
systemctl is-system-running
systemctl --failed
nproc
free -h
```

通過條件：

- [ ] 顯示 Ubuntu。
- [ ] systemd 可用。
- [ ] CPU 與 RAM 符合 `.wslconfig` 預期。
- [ ] 沒有會影響 runtime 的 failed service。

`systemctl is-system-running` 顯示 degraded 時，先查看 `systemctl --failed`，不要只憑 degraded 判定失敗。

## Step 3：D:\OPC 路徑

Ubuntu：

```bash
ls -la /mnt/d/OPC
printf 'wsl-write-ok\n' > /mnt/d/OPC/workspace/wsl-verification.txt
cat /mnt/d/OPC/workspace/wsl-verification.txt
```

通過條件：

- [ ] `/mnt/d/OPC` 對應正確資料。
- [ ] Workspace 可寫入。
- [ ] 沒有同一 repository 的第二份未同步副本。
- [ ] 專案檔案不是不明的 root-owned 檔案。

## Step 4：Docker Engine

PowerShell：

```powershell
docker version
docker info
docker context ls
docker run --rm hello-world
```

通過條件：

- [ ] Client 與 Server 都有版本資訊。
- [ ] Docker context 是預期的 Docker Desktop context。
- [ ] hello-world 成功。

Ubuntu：

```bash
docker version
```

確認 Ubuntu 使用同一個 Docker Desktop backend，而不是另一套獨立 daemon。

## Step 5：Compose 設定

進入測試 stack：

```powershell
Set-Location D:\OPC\runtime\compose-test
docker compose config
docker compose -p opc-compose-test up -d
docker compose -p opc-compose-test ps
docker compose -p opc-compose-test logs --tail 50
```

通過條件：

- [ ] Compose config 無錯誤。
- [ ] PostgreSQL 顯示 running / healthy。
- [ ] Log 沒有持續重啟或 authentication error。

## Step 6：資料持久化

依 `05-Docker-Compose-Standard.md` 建立 `verification` 測試資料後：

```powershell
docker compose -p opc-compose-test down
docker compose -p opc-compose-test up -d
```

重新查詢資料。

通過條件：

- [ ] Container 重建後資料仍存在。
- [ ] 沒有使用 `down -v`。
- [ ] Database 使用 named volume。

## Step 7：網路與 Port

```powershell
Get-NetTCPConnection -State Listen | Sort-Object LocalPort
Test-NetConnection localhost -Port 55432
```

通過條件：

- [ ] 測試 PostgreSQL port 可從 localhost 連線。
- [ ] Port 綁定符合 Compose 設定。
- [ ] 沒有不必要的服務對所有介面公開。

## Step 8：GPU（有 NVIDIA 才做）

Windows：

```powershell
nvidia-smi
```

Ubuntu：

```bash
nvidia-smi
```

兩邊都應顯示相同 GPU 與合理的 Driver/CUDA 資訊。

GPU container 測試應使用 Docker 官方文件當下提供、且與驅動相容的 CUDA image。不要把過時 image tag 固定寫死在手冊。

沒有 NVIDIA GPU 時，本項標記 SKIP，不算 FAIL。

## Step 9：資源與磁碟

PowerShell：

```powershell
Get-Volume -DriveLetter C,D
docker system df
```

Ubuntu：

```bash
free -h
nproc
```

通過條件：

- [ ] Windows 保有足夠 RAM。
- [ ] WSL2 RAM 與 CPU 上限符合設定。
- [ ] C 與 D 槽不低於安全空間。
- [ ] Docker 沒有大量未知 volume。
- [ ] 遊戲前可以先安全停止高負載 stack。

## Step 10：執行總驗收

```powershell
.\scripts\verify-all.ps1
```

判定：

- PASS：通過。
- WARN：理解原因並記錄。
- FAIL：停止後續部署。
- SKIP：只允許明確不適用項目，例如沒有 NVIDIA GPU。

## 最終判定

```text
WSL2 VERSION 2
+ /mnt/d/OPC 可讀寫
+ Docker Engine 正常
+ Compose healthy
+ Container 重建後資料存在
+ Port 沒有過度公開
+ 資源與容量安全
+ verify-all 沒有 FAIL
= WSL2 / DOCKER PASS
```

只有全部通過，才進入 AI Runtime。