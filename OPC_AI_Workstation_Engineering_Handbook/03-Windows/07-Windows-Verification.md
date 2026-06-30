# 03-Windows / 07 Windows 基礎驗收

## 目標

在安裝 WSL2、Docker 與 AI Runtime 前，確認 Windows 本身已穩定。這一章有 FAIL，就不要繼續往下做。

## Step 1：用系統管理員 PowerShell

按：

```text
開始
→ 搜尋 PowerShell
→ 右鍵
→ 以系統管理員身分執行
```

## Step 2：確認 Windows 版本

```powershell
Get-ComputerInfo | Select-Object WindowsProductName,WindowsVersion,OsBuildNumber
```

正常結果應顯示 Windows 11 與 build number。

如果顯示 Windows 10、空白或指令失敗，先停止。

## Step 3：確認 Secure Boot 與 TPM

```powershell
Confirm-SecureBootUEFI
Get-Tpm
```

正常結果：

- `Confirm-SecureBootUEFI` 顯示 `True`
- `TpmPresent` 顯示 `True`
- `TpmReady` 顯示 `True`

若 `Confirm-SecureBootUEFI` 報錯，先確認是否真的以 UEFI 模式開機。

## Step 4：確認磁碟沒有認錯

```powershell
Get-Disk | Format-Table Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus
Get-Volume | Format-Table DriveLetter,FileSystemLabel,FileSystem,HealthStatus,SizeRemaining
```

你要確認：

- 系統 SSD 是你預期的型號。
- D 槽對應 OPC 資料 SSD。
- D 槽標籤為 `OPC-DATA`。
- D 槽檔案系統是 NTFS。
- 所有重要磁碟狀態為 Online / Healthy。

如果 D 槽突然消失、變成 RAW、要求格式化，立刻停止。

## Step 5：確認驅動

```powershell
Get-PnpDevice | Where-Object Status -ne 'OK'
```

理想情況：沒有輸出。

若使用 NVIDIA：

```powershell
nvidia-smi
```

正常時會看到 GPU 型號、Driver Version 與顯存資訊。

## Step 6：確認 Windows Update

```powershell
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10
```

再回到：

```text
設定
→ Windows Update
```

確認沒有等待重新啟動。

## Step 7：確認 Defender

```powershell
Get-MpComputerStatus | Select-Object AntivirusEnabled,RealTimeProtectionEnabled
```

正常結果：兩者都是 `True`。

不要為了安裝開發工具關閉 Defender 或 Firewall。

## Step 8：確認基礎工具

```powershell
winget --version
pwsh --version
git --version
gh --version
code --version
```

如果某個指令顯示「不是內部或外部命令」，代表該工具還沒安裝或 PATH 尚未更新。

先重新開 PowerShell 再試；仍失敗才回到對應安裝章節。

## Step 9：確認遊戲與日常功能

手動確認：

- [ ] Steam 或主要遊戲平台可啟動。
- [ ] 遊戲可正常進入。
- [ ] 音訊正常。
- [ ] 藍牙正常。
- [ ] 網路正常。
- [ ] 睡眠與喚醒正常。

## 通過條件

- [ ] Windows 11 已更新。
- [ ] Secure Boot 與 TPM 正常。
- [ ] 系統 SSD 與資料 SSD 辨識正確。
- [ ] D 槽為 NTFS、標籤 OPC-DATA。
- [ ] 裝置管理員沒有重要裝置錯誤。
- [ ] GPU 驅動正常。
- [ ] Git、GitHub CLI、VS Code、PowerShell 可用。
- [ ] Defender 保持啟用。
- [ ] 遊戲、網路、音訊正常。

## 只有全部通過才進下一階段

下一階段是：

```text
WSL2
→ Docker Desktop
→ AI Runtime
```

若任何一項 FAIL，不要跳過。先修 Windows，因為後面的所有問題都會建立在這一層上。