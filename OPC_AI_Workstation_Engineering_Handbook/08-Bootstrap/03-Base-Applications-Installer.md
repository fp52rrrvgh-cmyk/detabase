# 08-Bootstrap / 03 Base Applications Installer

## 目標

用可重跑腳本安裝工作站必要應用，而不是逐一手動下載安裝程式。

## 建議套件

```text
Git.Git
GitHub.cli
Microsoft.VisualStudioCode
Microsoft.PowerShell
Microsoft.WindowsTerminal
Docker.DockerDesktop
```

Python、Node、GPU 驅動與主機板驅動應依硬體與版本策略分開處理，不應無條件安裝未知版本。

## PowerShell 範例

```powershell
$Packages = @(
  'Git.Git',
  'GitHub.cli',
  'Microsoft.VisualStudioCode',
  'Microsoft.PowerShell',
  'Microsoft.WindowsTerminal',
  'Docker.DockerDesktop'
)

foreach ($Package in $Packages) {
  winget list --id $Package -e | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[SKIP] $Package already installed"
    continue
  }

  winget install --id $Package -e --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to install $Package"
  }
}
```

## 安裝後驗證

```powershell
git --version
gh --version
code --version
pwsh --version
wt --version
docker --version
```

## 失敗處理

- 單一套件失敗時停止該 phase。
- 記錄 package id、exit code 與 log。
- 不因 winget 找不到套件而改用未知下載站。
- 需要重開機時寫入 state，停止後續 phase。

## 不應自動安裝

- 第三方 debloat 工具
- 驅動下載器
- 未經驗證的 registry optimizer
- 多套用途重疊的 AI coding extension
- 來源不明的模型或執行檔

## 驗收

- 所有必要套件可顯示版本。
- 第二次執行會跳過已安裝套件。
- 失敗套件有清楚報告。
- 安裝來源全部可追溯。