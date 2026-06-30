# 04-Storage / 09 Storage 驗收清單

## 使用方式

用系統管理員 PowerShell 逐段執行。任何一項 FAIL，都不要進入 WSL2、Docker 或 AI Runtime。

## Step 1：確認兩顆 SSD

```powershell
Get-Disk | Format-Table Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus
Get-Partition
Get-Volume | Format-Table DriveLetter,FileSystemLabel,FileSystem,HealthStatus,Size,SizeRemaining
```

通過條件：

- [ ] Windows 位於 C:。
- [ ] OPC 資料碟位於 D:。
- [ ] C: 與 D: 分屬不同實體 SSD。
- [ ] 兩顆 SSD 為 GPT。
- [ ] 沒有 Spanned Volume、Dynamic Disk 或 RAID 0。
- [ ] 磁碟型號、序號末碼與容量符合紀錄。

## Step 2：確認 D 槽

```powershell
Get-Volume -DriveLetter D
fsutil fsinfo volumeinfo D:
```

通過條件：

- [ ] FileSystem 是 NTFS。
- [ ] FileSystemLabel 是 OPC-DATA。
- [ ] HealthStatus 是 Healthy。
- [ ] D 槽不是 RAW。

## Step 3：確認 Workspace

```powershell
Test-Path D:\OPC
Get-ChildItem D:\OPC -Directory | Select-Object Name
```

必須包含：

```text
projects
workspace
runtime
artifacts
knowledge
models
logs
sandbox
config
secrets
backups
tools
```

再以 dry-run 測試 Bootstrap：

```powershell
.\scripts\bootstrap-opc-workspace.ps1 -Root 'D:\OPC' -WhatIf
```

通過條件：

- [ ] 不會刪除既有資料。
- [ ] 不會改到 C 槽。
- [ ] 重跑只建立缺少的目錄。

## Step 4：確認 Junction

```powershell
Get-ChildItem D:\OPC -Force |
  Where-Object LinkType |
  Select-Object FullName,LinkType,Target
```

初次建置正常情況應沒有 Junction。若有：

- [ ] LinkType 與 Target 正確。
- [ ] Target 存在。
- [ ] 沒有循環連結。
- [ ] 備份工具沒有重複備份。

## Step 5：確認 BitLocker

```powershell
manage-bde -status
Get-BitLockerVolume
```

通過條件：

- [ ] C 與 D 狀態已確認。
- [ ] 已加密磁碟的 recovery key 可在外部位置取得。
- [ ] Key ID 與磁碟對應清楚。
- [ ] 完整 recovery key 沒有放進 GitHub 或日誌。

## Step 6：確認容量

```powershell
Get-Volume -DriveLetter C,D |
  Select-Object DriveLetter,HealthStatus,Size,SizeRemaining,@{Name='FreePercent';Expression={[math]::Round(($_.SizeRemaining/$_.Size)*100,1)}}
```

通過條件：

- [ ] C 與 D HealthStatus 正常。
- [ ] 可用空間高於 20%，或已有明確容量處理計畫。

## Step 7：確認 Docker 持久化

Docker 安裝完成後執行：

```powershell
docker volume ls
docker system df
```

對測試 stack：

1. 建立一筆測試資料。
2. 執行 `docker compose down`。
3. 再執行 `docker compose up -d`。
4. 確認資料仍存在。

通過條件：

- [ ] 資料庫使用 named volume。
- [ ] 沒有使用 `docker compose down -v`。
- [ ] Container 重建後資料仍存在。

## Step 8：確認備份可還原

至少完成：

- [ ] 從 GitHub clone 一個重要 repository。
- [ ] 從外部備份打開一份文件。
- [ ] PostgreSQL dump 已還原到測試資料庫。
- [ ] SHA-256 checksum 一致。
- [ ] BitLocker recovery key 可取得。

## 最終判定

只有以下全部成立，Storage 才算通過：

```text
雙 SSD 辨識正確
+ D: 為 NTFS / OPC-DATA
+ D:\OPC 目錄完整
+ BitLocker 可恢復
+ 容量安全
+ Docker 資料可持久化
+ 外部備份已測試還原
= STORAGE PASS
```

任一項未完成，結果就是 `STORAGE FAIL`，不得進入後續部署。