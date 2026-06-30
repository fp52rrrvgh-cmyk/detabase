# 03-Windows / 14 Windows 疑難排解基線

## 目標

出問題時一次只做一個修復，不靠亂重灌、亂貼網路指令或同時改很多設定。

## 固定排查順序

```text
1. 說清楚症狀
2. 記錄發生時間
3. 想最近改了什麼
4. 保存錯誤畫面
5. 查看事件記錄
6. 只做一個修復
7. 再次驗證
```

## Step 1：先記錄，不要急著修

```text
症狀：
發生時間：
最近變更：
錯誤碼：
哪些功能正常：
哪些功能失敗：
```

## Step 2：查看事件記錄

```powershell
Get-WinEvent -LogName System -MaxEvents 50 |
  Select-Object TimeCreated,Id,LevelDisplayName,ProviderName,Message
```

若 `D:\OPC` 已建立，可保存：

```powershell
New-Item -ItemType Directory -Path D:\OPC\artifacts\troubleshooting -Force | Out-Null
Get-WinEvent -LogName System -MaxEvents 200 |
  Select-Object TimeCreated,Id,LevelDisplayName,ProviderName,Message |
  Out-File D:\OPC\artifacts\troubleshooting\system-events.txt -Encoding utf8
```

## Step 3：系統檔案損壞時

只有 Windows 元件異常、更新失敗或系統檔案錯誤時才執行：

```powershell
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
```

先 DISM，再 SFC。不要把它當每日保養。

## Step 4：網路問題

```powershell
ipconfig /all
Resolve-DnsName github.com
Test-NetConnection github.com -Port 443
```

判斷：

- `Resolve-DnsName` 失敗：可能是 DNS。
- DNS 成功但 443 失敗：可能是 Firewall、VPN、路由或網路中斷。
- 所有網站都失敗：先看網卡與數據機。

不要一開始就重設全部網路設定。

## Step 5：WSL2 問題

```powershell
wsl --status
wsl -l -v
wsl --update
```

若 WSL 卡住，先確認沒有重要任務，再執行：

```powershell
wsl --shutdown
```

檢查順序：

1. BIOS 虛擬化
2. Virtual Machine Platform
3. Windows Subsystem for Linux
4. Windows Update
5. WSL update

不要執行 `wsl --unregister`，除非你已備份且確定要刪除該 distribution。

## Step 6：Docker 問題

```powershell
docker version
docker context ls
docker info
wsl -l -v
```

先確認：

- Docker Desktop 是否啟動
- WSL2 是否正常
- C 槽與 Docker 儲存空間是否足夠
- VPN 或 Firewall 是否干擾

不要直接 Factory Reset，也不要執行：

```text
docker system prune --volumes
```

## Step 7：GPU 問題

```powershell
nvidia-smi
Get-PnpDevice -Class Display
```

如果遊戲正常但 WSL2 看不到 GPU：

1. 確認 Windows NVIDIA driver。
2. 執行 `wsl --update`。
3. 重新啟動 WSL2。
4. 再檢查容器 GPU 設定。

不要先重灌 Windows。

## Step 8：磁碟問題

```powershell
Get-Disk
Get-Volume
manage-bde -status
```

立即停止條件：

- D 槽變成 RAW
- Windows 要求格式化
- BitLocker 顯示 Locked
- SSD 型號或容量對不上

遇到這些情況，不要初始化、不要格式化、不要 Clean。

## 修復後紀錄

```text
症狀：
原因：
執行指令：
結果：
是否恢復：
是否需要新增或更新 Runbook：
```

## 禁止事項

- 同時套用多個修復。
- 執行來源不明的 PowerShell。
- 未備份就修改 Registry。
- 因單一服務失敗直接重灌。
- 刪除事件記錄後再排查。
- WSL 出錯就 `wsl --unregister`。
- Docker 出錯就 Factory Reset。
- 磁碟出錯就按格式化。

## 升級條件

同一問題重複兩次以上，才值得建立獨立 Runbook。若只是一次性錯誤，保留簡短紀錄即可，不新增多餘文件。