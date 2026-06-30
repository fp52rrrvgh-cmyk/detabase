# 04-Storage / 09 Storage 驗收清單

## 磁碟結構

```powershell
Get-Disk
Get-Partition
Get-Volume
```

確認：

- Windows 位於 C:
- OPC 資料碟位於 D:
- 兩顆 SSD 為獨立磁碟
- 分割表為 GPT
- 沒有跨碟 Spanned Volume
- 沒有未預期的 RAID 0

## 檔案系統

```powershell
Get-Volume -DriveLetter D
fsutil fsinfo volumeinfo D:
```

確認：

- D: 使用 NTFS
- Volume Label 為 OPC-DATA
- HealthStatus 正常

## Workspace

```powershell
Get-ChildItem D:\OPC -Directory | Select-Object Name
```

應包含：

- projects
- workspace
- runtime
- artifacts
- knowledge
- models
- logs
- sandbox
- config
- secrets
- backups
- tools

## Junction / Link

```powershell
Get-ChildItem D:\OPC -Force |
  Where-Object LinkType |
  Select-Object FullName,LinkType,Target
```

確認所有連結目標都存在，且沒有循環連結。

## Docker

```powershell
docker volume ls
docker system df
```

確認：

- Named volumes 有清楚命名
- 資料庫 volume 可辨識
- 沒有大量未知 volume

## 容量

```powershell
Get-PSDrive C,D
```

確認兩個磁碟都保有至少 20% 或合理的安全空間。

## BitLocker

```powershell
manage-bde -status
```

若已啟用，確認 Recovery Key 已保存於外部位置。

## 備份還原測試

- Clone 一個 repository 到測試目錄
- 還原一份資料庫 dump
- 還原一個 Docker 測試 volume
- 驗證 checksum
- 記錄測試日期與結果

## 通過條件

只有當磁碟、Workspace、Docker volume、容量與備份還原全部通過，Storage Engineering 才視為完成。