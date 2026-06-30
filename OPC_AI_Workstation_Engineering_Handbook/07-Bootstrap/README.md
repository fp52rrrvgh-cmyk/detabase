# 07 Bootstrap：重灌後一鍵重建的方向

## 1. Bootstrap 是什麼

Bootstrap 是工作站的開機建設腳本。它的目標不是取代所有人工操作，而是讓重灌後的恢復流程可重複、可驗證。

## 2. Phase 0 Bootstrap 目標

第一階段只做安全且低風險的事情：

- 建立 `D:\OPC` 目錄結構。
- 檢查 winget / git / gh / code / wsl / docker。
- 產生 `.env.example`，但不寫入真正 secrets。
- 建立 runtime、projects、logs、artifacts 目錄。

## 3. 不做的事

Phase 0 不做：

- 不自動格式化磁碟。
- 不自動修改 BIOS。
- 不自動停用 Windows service。
- 不自動寫入真實 API keys。
- 不自動部署 production database。

## 4. PowerShell Bootstrap 草案

```powershell
$Root = "D:\OPC"
$Dirs = @(
  "projects",
  "knowledge",
  "artifacts",
  "runtime",
  "logs",
  "models",
  "sandbox",
  "backups",
  "config",
  "secrets"
)

New-Item -ItemType Directory -Path $Root -Force | Out-Null
foreach ($d in $Dirs) {
  New-Item -ItemType Directory -Path "$Root\$d" -Force | Out-Null
}

Write-Host "OPC workspace created at $Root"
```

## 5. Doctor 檢查草案

```powershell
winget --version
git --version
gh --version
code --version
wsl --version
docker --version
```

## 6. 驗收

- `D:\OPC` 存在。
- 所有目錄存在。
- 工具版本能顯示。
- 沒有 secrets 被寫進 Git。
