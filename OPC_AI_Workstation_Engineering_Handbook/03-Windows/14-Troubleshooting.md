# 03-Windows / 14 Windows 疑難排解基線

## 目標

在問題發生時，以可重現、可驗證的方法排查，不靠反覆重灌或隨機套用網路指令。

## 排查順序

```text
確認症狀
→ 記錄發生時間
→ 查看最近變更
→ 查看事件記錄
→ 驗證服務與驅動
→ 最小化重現
→ 套用單一修復
→ 再次驗證
```

## 1. 查看事件記錄

```powershell
Get-WinEvent -LogName System -MaxEvents 50 |
  Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, Message
```

應將重要結果存入：

```text
D:\OPC\artifacts\troubleshooting\
```

## 2. 系統完整性檢查

先執行 DISM，再執行 SFC：

```powershell
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
```

不要在沒有症狀時每天執行；這些是排錯工具，不是日常最佳化工具。

## 3. 網路問題

```powershell
ipconfig /all
Resolve-DnsName github.com
Test-NetConnection github.com -Port 443
```

不要一開始就重設所有網路設定，先確認是 DNS、路由、防火牆還是服務問題。

## 4. WSL2 問題

```powershell
wsl --status
wsl -l -v
wsl --shutdown
wsl --update
```

若 WSL2 失敗，依序檢查：

- BIOS 虛擬化
- Virtual Machine Platform
- Windows Subsystem for Linux
- Windows Update
- WSL kernel update

## 5. Docker 問題

```powershell
docker version
docker context ls
docker info
wsl -l -v
```

常見原因：

- Docker Desktop 未啟動
- WSL2 backend 失敗
- 磁碟空間不足
- Docker volume 損壞
- 公司 VPN 或防火牆干擾

## 6. GPU 問題

```powershell
nvidia-smi
Get-PnpDevice -Class Display
```

若遊戲正常但 WSL2 看不到 GPU，不要先重裝整個 Windows；先檢查 Windows GPU driver、WSL 更新與容器 GPU 設定。

## 7. 變更紀錄

每次修復建立紀錄：

```text
症狀：
發生時間：
最近變更：
執行指令：
結果：
是否恢復：
是否建立 ADR / Runbook：
```

## 禁止事項

- 同時套用多個修復
- 執行來源不明的 PowerShell
- 未備份就修改 Registry
- 因單一服務失敗直接重灌
- 刪除事件記錄後再排查

## 升級條件

若同一問題重複兩次以上，必須建立獨立 Runbook；若涉及架構選擇，建立 ADR。