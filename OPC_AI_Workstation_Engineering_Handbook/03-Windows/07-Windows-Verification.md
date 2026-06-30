# 03-Windows / 07 Windows 基礎驗收

## 目標

在進入 WSL2、Docker 與 AI Runtime 前，確認 Windows Host 已經穩定。

## 系統資訊

```powershell
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber
```

## 安全與開機

```powershell
Confirm-SecureBootUEFI
Get-Tpm
```

## 驅動與裝置

```powershell
Get-PnpDevice | Where-Object Status -ne 'OK'
nvidia-smi
```

若不是 NVIDIA，可略過 `nvidia-smi`。

## 更新狀態

```powershell
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10
```

## 開發工具

```powershell
winget --version
pwsh --version
git --version
gh --version
code --version
```

## 虛擬化與 WSL2

```powershell
wsl --status
wsl -l -v
```

## Defender

```powershell
Get-MpComputerStatus | Select-Object AntivirusEnabled, RealTimeProtectionEnabled
```

## 通過條件

- Windows 11 已更新
- Secure Boot 與 TPM 正常
- 裝置管理員沒有未知裝置
- GPU 驅動正常
- Git、GitHub CLI、VS Code 可用
- WSL2 可用
- Defender 保持啟用
- Steam 或主要遊戲平台可正常啟動

只有全部通過，才進入 Docker 與 AI Runtime 建置。
