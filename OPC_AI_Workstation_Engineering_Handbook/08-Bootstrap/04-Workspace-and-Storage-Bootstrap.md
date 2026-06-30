# 08-Bootstrap / 04 Workspace 與 Storage Bootstrap

## 目標

驗證資料碟後建立 `D:\OPC` 標準結構，避免腳本誤把工作區建立在錯誤磁碟。

## Preflight

```powershell
$Volume = Get-Volume -DriveLetter D -ErrorAction Stop
if ($Volume.FileSystem -ne 'NTFS') {
  throw 'D: must use NTFS in Phase 1'
}
if ($Volume.FileSystemLabel -ne 'OPC-DATA') {
  throw 'Unexpected D: volume label'
}
```

Bootstrap 不應自動格式化未知磁碟。磁碟初始化與格式化屬於高風險人工施工步驟。

## 建立目錄

```powershell
$Root = 'D:\OPC'
$Directories = @(
  'projects','workspace','runtime','artifacts','knowledge','models',
  'logs','sandbox','config','secrets','backups','tools'
)

New-Item -ItemType Directory -Path $Root -Force | Out-Null
foreach ($Directory in $Directories) {
  New-Item -ItemType Directory -Path (Join-Path $Root $Directory) -Force | Out-Null
}
```

## 寫入 Workspace Marker

```json
{
  "schema_version": 1,
  "workspace": "OPC",
  "volume_label": "OPC-DATA"
}
```

建議位置：

```text
D:\OPC\.opc-workspace.json
```

後續腳本必須先驗證 marker，避免在錯誤目錄執行清理或部署。

## 權限

- 一般使用者應可操作 `D:\OPC`。
- 不給 Everyone Full Control。
- Agent 只取得指定子目錄權限。
- `secrets` 目錄應使用更嚴格 ACL。

## 驗收

- D: 標籤為 OPC-DATA。
- 標準目錄全部存在。
- Workspace marker 可解析。
- 重跑不會刪除現有專案。
- Agent session 無法越界讀寫未授權目錄。