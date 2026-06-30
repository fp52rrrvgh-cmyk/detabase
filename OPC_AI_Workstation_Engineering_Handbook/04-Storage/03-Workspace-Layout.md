# 04-Storage / 03 OPC Workspace 標準目錄

## 目標

讓所有專案、Agent、腳本與產物都使用同一個根目錄：

```text
D:\OPC
```

## 建立前先確認

執行：

```powershell
Get-Volume -DriveLetter D
```

必須確認：

- FileSystem 是 NTFS。
- FileSystemLabel 是 `OPC-DATA`。
- HealthStatus 正常。

若不符合，不要建立 workspace。

## 標準結構

```text
D:\OPC
├─ projects\      Git repositories 與正式專案
├─ workspace\     暫時工作區與任務草稿
├─ runtime\       Docker Compose、服務設定與 runtime state
├─ artifacts\     報告、測試結果、截圖與輸出成果
├─ knowledge\     文件、RAG 資料與研究資料
├─ models\        本機模型與模型快取
├─ logs\          可清理的執行紀錄
├─ sandbox\       Agent 隔離工作區
├─ config\        非敏感設定與範本
├─ secrets\       secret reference；不得進 Git
├─ backups\       本機暫存備份；不是唯一備份
└─ tools\         OPC CLI、bootstrap、doctor scripts
```

## Step 1：使用 Bootstrap 建立

優先使用：

```powershell
D:\OPC\tools\bootstrap-opc-workspace.ps1
```

第一次使用時，腳本本身可能尚未位於 D 槽，可從手冊 repository 的 `scripts` 目錄執行：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\bootstrap-opc-workspace.ps1 -Root 'D:\OPC' -WhatIf
```

先使用 `-WhatIf` 查看它要建立什麼。確認無誤後移除 `-WhatIf`：

```powershell
.\scripts\bootstrap-opc-workspace.ps1 -Root 'D:\OPC'
```

腳本應拒絕在非 NTFS、標籤不是 `OPC-DATA` 的磁碟執行。

## Step 2：確認目錄

```powershell
Get-ChildItem D:\OPC -Directory | Select-Object Name
```

必須看到全部標準目錄。

## 使用規則

- 正式 Git 專案只放 `projects`。
- 任務產物放 `artifacts`，不要散落桌面。
- 暫存資料放 `workspace` 或 `sandbox`。
- Compose 與服務設定放 `runtime`。
- 日誌放 `logs`，並設定保留期限。
- API key 不得放 `config`、README 或 Git repository。
- `backups` 只是本機暫存，不算外部備份。
- Agent 預設只讀寫被授權的子目錄。

## 命名規則

使用：

```text
lowercase-kebab-case
```

例如：

```text
trip-report-system
finance-ops
opc-runtime
```

避免空格、中文符號與 `新資料夾 (3)` 之類名稱。

## 完成條件

- [ ] D: 是 NTFS。
- [ ] D: 標籤是 OPC-DATA。
- [ ] 所有標準目錄都存在。
- [ ] Bootstrap 重跑不會刪除既有資料。
- [ ] `backups` 沒被誤認為唯一備份。

## 停止條件

- Bootstrap 指向 C 槽或其他磁碟。
- D: 標籤不正確。
- 腳本要刪除既有專案。
- `D:\OPC` 已存在但內容來源不明。
