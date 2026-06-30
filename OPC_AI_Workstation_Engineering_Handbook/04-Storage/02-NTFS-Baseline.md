# 04-Storage / 02 NTFS 基線

## 目標

以相容性、可救援性與小白維護成本為優先，建立穩定的 OPC 資料碟。

## Phase 1 採用 NTFS

OPC Phase 1 的 `D:\OPC` 使用 NTFS，而不是 ReFS、Storage Spaces、Dynamic Disk、Spanned Volume 或 RAID 0。

理由：

- Windows、遊戲、備份工具、Git、Docker Desktop 相容性高。
- 檔案權限、BitLocker、Junction、Symlink 等功能成熟。
- 發生問題時，救援工具與教學較多。
- 重灌後重新掛載與辨識較簡單。
- 對目前單人工作站來說，救援簡單比理論效能更重要。

## 破壞性警告

`Initialize-Disk`、`New-Partition`、`Format-Volume` 都可能讓資料不可恢復。只有在**確定該 SSD 是空白資料碟**，且已完成外部備份與還原測試後，才可進入格式化流程。

如果 D 槽已經有資料，重灌後看到 Windows 提示「需要初始化」或「需要格式化」時，**不要按確定**。先停止施工，確認 BitLocker、磁碟狀態與 recovery key。

## Gate 1：確認資料碟是否已有資料

先執行：

```powershell
Get-PhysicalDisk | Select-Object FriendlyName,SerialNumber,MediaType,Size
Get-Disk | Select-Object Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus
Get-Volume | Select-Object DriveLetter,FileSystemLabel,FileSystem,Size,SizeRemaining
```

建立人工確認表：

| 項目 | 值 |
|---|---|
| 目標資料 SSD 型號 |  |
| 目標資料 SSD 序號末碼 |  |
| 目標資料 SSD 容量 |  |
| 目前是否已有資料 | 是 / 否 |
| 是否已備份並測試還原 | 是 / 否 |
| 是否可安全格式化 | 是 / 否 |

只有最後一欄是「是」，才能執行格式化。

## Gate 2：BitLocker 狀態

```powershell
manage-bde -status
Get-BitLockerVolume
```

若目標磁碟曾啟用 BitLocker 或裝置加密，必須先確認 recovery key 可取得。否則不要初始化或格式化。

## 安全格式化流程：只適用於空白資料 SSD

以下流程仍需人工填入 `$DiskNumber`，不得自動猜測。

```powershell
Get-Disk | Format-Table Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus

$DiskNumber = Read-Host "Enter the verified EMPTY OPC data disk number"
$Disk = Get-Disk -Number $DiskNumber
$Disk | Format-List Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus

$Confirm = Read-Host "Type FORMAT-OPC-DATA to initialize and format this EMPTY disk"
if ($Confirm -ne 'FORMAT-OPC-DATA') {
  throw 'User confirmation failed. Stop.'
}

if ($Disk.PartitionStyle -ne 'RAW') {
  throw 'Disk is not RAW. Refusing to initialize or format an existing disk.'
}

Initialize-Disk -Number $DiskNumber -PartitionStyle GPT
New-Partition -DiskNumber $DiskNumber -UseMaximumSize -DriveLetter D |
  Format-Volume -FileSystem NTFS -NewFileSystemLabel 'OPC-DATA' -AllocationUnitSize 4096 -Confirm
```

## 已有 D 槽資料時

不要執行 Initialize-Disk 或 Format-Volume。只做驗證：

```powershell
Get-Volume -DriveLetter D
fsutil fsinfo volumeinfo D:
Test-Path D:\OPC
```

如果 `D:\OPC` 存在，後續 Bootstrap 只能建立缺少的子目錄，不得刪除或覆蓋既有專案。

## 配置單位

一般專案、程式碼、文件與混合資料使用 4 KB 配置單位。不要為大型模型擅自改成 64 KB，除非該磁碟區只存大型檔案且已測試工具相容性。

## 磁碟標籤

固定標籤：

```text
OPC-DATA
```

磁碟代號可能改變，但 Volume Label 可協助 Bootstrap 驗證是否掛載正確資料碟。

## 驗收

```powershell
Get-Volume -DriveLetter D
fsutil fsinfo volumeinfo D:
Test-Path D:\OPC
```

確認：

- FileSystem 為 NTFS
- HealthStatus 正常
- 標籤為 OPC-DATA
- 磁碟代號為 D
- 已有資料未被破壞

## 禁止事項

- 在未確認磁碟型號、序號與容量前執行 Initialize-Disk
- 對非 RAW 磁碟執行初始化或格式化
- 使用快速教學直接 Clean 整顆磁碟
- 把資料碟設為 Dynamic Disk
- 建立 RAID 0 或 Spanned Volume
- 開啟 NTFS 壓縮到整個 `D:\OPC`
- 對 BitLocker recovery key 不明的磁碟嘗試修復或格式化
