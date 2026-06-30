# 05-Development / 03 Visual Studio Code

## 目標
建立統一的 Windows 與 WSL2 開發入口。

## 安裝
```powershell
winget install --id Microsoft.VisualStudioCode -e
```

## 必要擴充套件
- WSL
- Dev Containers
- Docker
- Python
- Pylance
- GitHub Pull Requests
- PowerShell

## 使用原則
- Windows 端用 VS Code 開啟介面
- Linux 工具與專案執行可透過 WSL Remote
- 不要同時在 Windows 與 WSL 建立兩份相同專案
- 專案根目錄固定於 `D:\OPC\projects`

## 建議設定
```json
{
  "files.autoSave": "afterDelay",
  "editor.formatOnSave": true,
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "git.autofetch": true
}
```

## 不建議
- 安裝大量用途重疊的 AI coding extension
- 把 API key 寫入 settings.json
- 對所有 workspace 一律信任
- 讓 extension 自動執行未知 shell command

## 驗收
- VS Code 可從 PowerShell 使用 `code .` 開啟
- WSL extension 可連入 Ubuntu
- Git 狀態正常顯示
- Python interpreter 可選擇專案虛擬環境
