# 03-Windows / 05 Hyper-V、虛擬化與 WSL2 基礎

## 目標

讓 WSL2 與 Docker Desktop 可以正常使用，同時避免把遊戲需要的穩定性搞壞。

## Step 1：先確認 BIOS 虛擬化

重新開機進 BIOS / UEFI。

常見名稱：

- Intel：`Intel Virtualization Technology`、`VT-x`
- AMD：`SVM Mode`

把它設為 Enabled，儲存並離開 BIOS。

不知道在哪裡時，不要亂改其他選項。只找虛擬化設定。

## Step 2：在 Windows 確認是否已啟用

開啟工作管理員：

```text
Ctrl + Shift + Esc
→ 效能
→ CPU
```

右下角應看到：

```text
虛擬化：已啟用
```

也可在 PowerShell 執行：

```powershell
systeminfo | Select-String 'Virtualization|Hyper-V'
```

## Step 3：安裝 WSL 必要元件

以系統管理員 PowerShell 執行：

```powershell
wsl --install
```

正常情況會安裝：

- Windows Subsystem for Linux
- Virtual Machine Platform
- 預設 Linux distribution

安裝完成後依提示重新開機。

## Step 4：確認 Ubuntu 是 WSL2

```powershell
wsl --status
wsl -l -v
```

正常結果中，Ubuntu 的 `VERSION` 必須是 `2`。

若顯示 VERSION 1：

```powershell
wsl --set-version Ubuntu 2
```

Distribution 名稱若不是 `Ubuntu`，請使用 `wsl -l -v` 顯示的實際名稱。

## Step 5：確認 Windows 功能

如果 `wsl --install` 失敗，可先檢查：

```powershell
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
```

兩者應顯示 `State : Enabled`。

若未啟用：

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart
Restart-Computer
```

## 遊戲相容原則

OPC 需要 WSL2 與 Docker，因此硬體虛擬化屬於必要基礎。

不要為了網路上的「遊戲最佳化」教學全域關閉虛擬化、Virtual Machine Platform 或安全功能。若特定遊戲真的發生反作弊衝突，只針對該遊戲驗證。

## 完成條件

- [ ] 工作管理員顯示虛擬化已啟用。
- [ ] `wsl --status` 成功。
- [ ] `wsl -l -v` 顯示 Ubuntu VERSION 2。
- [ ] Windows 沒有因啟用虛擬化而反覆重開機。
- [ ] 主要遊戲仍可正常啟動。

## 停止條件

- BIOS 改完後無法正常開機。
- Windows 啟用功能後反覆藍畫面。
- `wsl --install` 持續出現相同錯誤。
- 工作管理員仍顯示虛擬化未啟用。

遇到以上情況，不要繼續裝 Docker。先把 BIOS 與 WSL2 基礎修好。