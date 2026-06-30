# 04-Storage / 01 雙 SSD 磁碟配置

## 目標

讓兩顆 M.2 SSD 保持獨立，避免一顆故障拖垮整台工作站，同時固定所有 OPC 路徑。

## 固定配置

### SSD 1：Windows 系統碟

```text
C:\
  Windows
  Program Files
  使用者資料
  Steam / Battle.net 啟動器
  一般桌面軟體
```

### SSD 2：OPC 資料碟

```text
D:\OPC
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

## 為什麼不能把兩顆 SSD 合併

不要使用：

- RAID 0
- Spanned Volume
- Dynamic Disk
- Storage Spaces Simple

原因：任一顆 SSD 故障，都可能讓整個邏輯磁碟失效。OPC 需要的是固定路徑，不是把硬碟真的合併。

## Step 1：重灌前記錄兩顆 SSD

以系統管理員 PowerShell 執行：

```powershell
Get-PhysicalDisk | Select-Object FriendlyName,SerialNumber,MediaType,Size
Get-Disk | Select-Object Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus
```

建立人工紀錄：

| 用途 | 型號 | 序號末碼 | 容量 |
|---|---|---|---:|
| Windows 系統 SSD |  |  |  |
| OPC 資料 SSD |  |  |  |

不要只記 `Disk 0`、`Disk 1`，因為編號可能改變。

## Step 2：安裝 Windows 時

最安全做法：

1. 關機。
2. 暫時拔除 OPC 資料 SSD。
3. 只留下 Windows 系統 SSD。
4. 安裝 Windows。
5. Windows 可正常開機後再關機。
6. 接回 OPC 資料 SSD。

若無法拔除，必須靠型號、序號末碼與容量辨識，無法確定就停止。

## Step 3：接回資料 SSD 後

先執行：

```powershell
Get-Disk
Get-Volume
manage-bde -status
```

如果 Windows 跳出「初始化磁碟」或「格式化」提示：

```text
不要按確定
不要按初始化
不要按格式化
```

先確認 BitLocker、分割表與 SSD 型號。

## Step 4：確認磁碟結構

```powershell
Get-Disk | Format-Table Number,FriendlyName,SerialNumber,PartitionStyle,Size,OperationalStatus
Get-Partition
Get-Volume | Format-Table DriveLetter,FileSystemLabel,FileSystem,HealthStatus,Size,SizeRemaining
```

正確結果：

- Windows 在 C:。
- OPC 資料 SSD 在 D:。
- 兩顆 SSD 都是獨立磁碟。
- 分割表為 GPT。
- 沒有跨碟 Spanned Volume。
- 沒有 RAID 0。

## 完成條件

- [ ] 兩顆 SSD 型號、序號末碼與容量已記錄。
- [ ] Windows 與 OPC 資料碟沒有認錯。
- [ ] C: 與 D: 分屬不同實體 SSD。
- [ ] 兩顆 SSD 都是 GPT。
- [ ] 沒有 RAID 0、Dynamic Disk、Spanned Volume。

## 停止條件

- 看不懂哪顆 SSD 是哪顆。
- D: 變成 RAW。
- 接回 SSD 後 Windows 要求格式化。
- BitLocker 顯示 Locked。
- EFI 分割區出現在錯誤磁碟。

遇到以上狀況，不要往下建立 `D:\OPC`。