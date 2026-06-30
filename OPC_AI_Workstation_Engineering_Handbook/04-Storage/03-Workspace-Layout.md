# 04-Storage / 03 OPC Workspace 標準目錄

## 目標

讓所有 Agent、腳本、專案與文件都以同一個根目錄運作，避免路徑分散與任務遺失。

## 標準根目錄

```text
D:\OPC
```

## 建議結構

```text
D:\OPC
├─ projects\      # Git repositories 與正式專案
├─ workspace\     # 暫時工作區與任務草稿
├─ runtime\       # Docker Compose、服務設定、runtime state
├─ artifacts\     # 報告、測試結果、截圖、輸出成果
├─ knowledge\     # 文件、RAG 資料、研究資料
├─ models\        # 本機模型與模型快取
├─ logs\          # 可清理的執行紀錄
├─ sandbox\       # Agent 隔離工作區
├─ config\        # 非敏感設定與範本
├─ secrets\       # 只存 secret reference，不進 Git
├─ backups\       # 本機暫存備份，不是唯一備份
└─ tools\         # OPC CLI、bootstrap、doctor scripts
```

## 邊界規則

- 正式 Git 專案只放 `projects`。
- 任務產物只放 `artifacts`，不要散落桌面。
- 暫存檔放 `workspace` 或 `sandbox`。
- 日誌放 `logs`，並設定保留期限。
- API key 不得放 `config` 或專案 README。
- Agent 預設只可讀寫被授權的 OPC 子目錄。

## 命名規則

資料夾與專案名稱建議使用：

```text
lowercase-kebab-case
```

例如：

```text
trip-report-system
finance-ops
opc-runtime
```

避免空格、中文符號與沒有意義的名稱，例如 `新資料夾 (3)`。

## 建立指令

```powershell
$Root = 'D:\OPC'
$Dirs = @('projects','workspace','runtime','artifacts','knowledge','models','logs','sandbox','config','secrets','backups','tools')
New-Item -ItemType Directory -Path $Root -Force | Out-Null
$Dirs | ForEach-Object {
  New-Item -ItemType Directory -Path (Join-Path $Root $_) -Force | Out-Null
}
```

## 驗收

```powershell
Get-ChildItem D:\OPC -Directory | Select-Object Name
```

輸出應包含全部標準目錄。