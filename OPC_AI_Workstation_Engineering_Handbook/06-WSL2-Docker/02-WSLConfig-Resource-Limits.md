# 06-WSL2-Docker / 02 `.wslconfig` 資源限制

## 目標

避免 WSL2、Docker 或本機 AI 任務吃光 Windows 的 RAM、CPU 與 swap，保留遊戲與日常操作空間。

## 設定檔位置

```text
%UserProfile%\.wslconfig
```

修改後必須執行：

```powershell
wsl --shutdown
```

然後重新啟動 WSL2。

## 先檢查版本

`.wslconfig` 部分設定會隨 WSL 版本變動。先記錄：

```powershell
wsl --version
wsl --status
wsl -l -v
```

如果 `wsl --version` 無法執行，代表環境可能是舊版收件匣 WSL，先執行：

```powershell
wsl --update
```

再重開機或 `wsl --shutdown` 後重新檢查。

## 安全原則

- 不知道硬體規格時，不寫固定數值。
- RAM 至少保留 8 GB 給 Windows；若要玩遊戲，保留更多。
- CPU 不要全部分配給 WSL2。
- swap 作為緩衝，不是實體記憶體替代品。
- experimental 設定只在版本支援且可驗證時使用。

## 保守起始範例：32 GB RAM 桌機

```ini
[wsl2]
memory=16GB
processors=6
swap=8GB
localhostForwarding=true
```

## 可選 experimental 設定

只有當目前 WSL 官方文件與 `wsl --version` 顯示支援時，才加入：

```ini
[experimental]
autoMemoryReclaim=gradual
sparseVhd=true
```

若加入後 WSL2 或 Docker 異常，先移除 `[experimental]` 區塊，再執行：

```powershell
wsl --shutdown
```

## 依 RAM 調整

| 實體 RAM | 起始 memory | 起始 processors | 備註 |
|---:|---:|---:|---|
| 16 GB | 6-8 GB | 2-4 | 不建議本機大型模型 |
| 32 GB | 12-16 GB | 4-6 | 平衡 AI 與遊戲 |
| 64 GB | 24-32 GB | 6-10 | 可承載較多容器 |

這只是起點，最終以 `free -h`、工作負載與遊戲實測為準。

## 驗證

PowerShell：

```powershell
wsl --shutdown
wsl -d Ubuntu
```

Ubuntu：

```bash
nproc
free -h
cat /proc/meminfo | head
```

Docker 驗證：

```powershell
docker run --rm hello-world
```

## 遊戲模式

遊戲前可停止 WSL2：

```powershell
wsl --shutdown
```

但只在沒有執行中的 Agent、資料庫寫入或 Docker 任務時使用。若需要保留 runtime，使用 OPC 的 Pause 流程，不要直接關閉 WSL2。

## 常見錯誤

- 把全部 RAM 分給 WSL2
- processors 設為全部邏輯核心
- 未停止 WSL 就期待設定立即生效
- swap 設得過大並放在空間不足的 C 槽
- 直接照抄網路教學的 experimental 設定
- Docker 正在寫入 database 時執行 `wsl --shutdown`

## 驗收

- Windows 閒置與遊戲時仍有足夠 RAM
- WSL2 可取得預期 CPU 與記憶體
- 大型任務不造成 Windows 無回應
- Docker container 在限制內正常運作
- 移除 experimental 區塊後仍可正常回復
