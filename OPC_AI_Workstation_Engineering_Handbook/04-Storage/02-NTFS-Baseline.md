# 04-Storage / 02 NTFS 基線

## 目標

以相容性、可救援性與小白維護成本為優先，建立穩定的 OPC 資料碟。

## Phase 1 採用 NTFS

OPC Phase 1 的 `D:\OPC` 使用 NTFS，而不是 ReFS、Storage Spaces 或跨碟磁碟區。

理由：

- Windows、遊戲、備份工具、Git、Docker Desktop 相容性高。
- 檔案權限、壓縮、BitLocker、Junction、Symlink 等功能成熟。
- 發生問題時，救援工具與教學較多。
- 重灌後重新掛載與辨識較簡單。

## 格式化資料碟

先確認磁碟號碼與容量，再執行。以下指令只作範例，不可直接複製到未知磁碟：

```powershell
Get-Disk
Initialize-Disk -Number <DISK_NUMBER> -PartitionStyle GPT
New-Partition -DiskNumber <DISK_NUMBER> -UseMaximumSize -DriveLetter D
Format-Volume -DriveLetter D -FileSystem NTFS -NewFileSystemLabel "OPC-DATA" -AllocationUnitSize 4096
```

## 配置單位

一般專案、程式碼、文件與混合資料使用預設 4 KB 配置單位。不要為大型模型擅自改成 64 KB，除非該磁碟區只存大型檔案且已測試工具相容性。

## 磁碟標籤

建議使用固定標籤：

```text
OPC-DATA
```

磁碟代號可能改變，但 Volume Label 可協助 Bootstrap 驗證是否掛載正確資料碟。

## 驗收

```powershell
Get-Volume -DriveLetter D
fsutil fsinfo volumeinfo D:
```

確認：

- FileSystem 為 NTFS
- HealthStatus 正常
- 標籤為 OPC-DATA
- 磁碟代號為 D

## 禁止事項

- 在未確認磁碟號碼前執行 Initialize-Disk
- 使用快速教學直接 Clean 整顆磁碟
- 把資料碟設為 Dynamic Disk
- 開啟 NTFS 壓縮到整個 `D:\OPC`
