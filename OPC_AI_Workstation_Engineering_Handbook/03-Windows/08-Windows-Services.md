# 03-Windows / 08 Windows Services 管理原則

## 目標

降低不必要的背景負擔，但不破壞 Windows Update、遊戲平台、WSL2、Docker、音訊、網路與安全功能。

## 核心原則

- 不使用網路上的一鍵停用服務腳本。
- 不以「看起來沒用」作為停用理由。
- 不永久停用系統核心服務。
- 任何服務調整都必須可還原、可驗證。

## 建議保持啟用或預設狀態

以下服務與功能不應隨意停用：

- Windows Update
- Background Intelligent Transfer Service
- Microsoft Defender Antivirus Service
- Windows Event Log
- Task Scheduler
- DHCP Client
- DNS Client
- Windows Audio
- Windows Management Instrumentation
- Hyper-V / Virtual Machine Platform 相關服務
- WSL 相關服務
- Docker Desktop 相關服務

## 可依需求調整的服務

只有在明確不用該功能時，才考慮改為手動或停用：

- Print Spooler：沒有印表機需求時
- Fax：不使用傳真時
- Bluetooth Support Service：電腦沒有藍牙裝置時
- Xbox 相關服務：完全不使用 Xbox App、Game Pass、Game Bar 時
- Remote Registry：一般個人電腦通常不需要

## 不建議的做法

- 一次停用十幾個服務後再觀察
- 關閉 Event Log，導致錯誤無法追查
- 關閉 Task Scheduler，導致更新、備份與 Agent 排程異常
- 關閉 Windows Update 以追求穩定
- 關閉所有 Xbox 服務後再使用 Game Pass

## 查詢服務狀態

```powershell
Get-Service | Sort-Object Status, DisplayName
Get-Service wuauserv,bits,WinDefend,eventlog,schedule
```

## 調整前紀錄

```powershell
Get-Service | Select-Object Name,DisplayName,Status,StartType |
  Export-Csv D:\OPC\backups\windows-services-before.csv -NoTypeInformation -Encoding UTF8
```

## 驗收

- Windows Update 正常
- 音訊與網路正常
- WSL2 正常
- Docker Desktop 正常
- Steam / Battle.net / Xbox App 依需求正常
- 事件檢視器仍可記錄錯誤

## OPC 結論

Windows Services 採保守策略：預設值優先，只有具體問題與實測證據時才調整。