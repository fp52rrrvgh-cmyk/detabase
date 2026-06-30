# 04-Storage / 01 雙 SSD 磁碟配置

## 目標

保留兩顆 M.2 SSD 的獨立性，同時讓你與 Agent 只需要面對單一工作根目錄。

## 建議配置

### SSD 1：系統與一般應用

```text
C:\
  Windows
  Program Files
  使用者資料
  Steam / Battle.net 啟動器
  常用桌面軟體
```

### SSD 2：OPC 工作區與大型資料

```text
D:\OPC
  projects
  runtime
  knowledge
  artifacts
  logs
  models
  sandbox
  backups
```

## 為什麼不合併成一顆邏輯磁碟

真正合併磁碟，例如 RAID 0、Spanned Volume、Storage Spaces Simple，會讓兩顆 SSD 形成共同故障域。任一磁碟失效，都可能讓整個磁碟區無法使用。

而 Agent 忘記另一顆磁碟的根本原因，不是磁碟太多，而是工作路徑不固定。因此用單一 `D:\OPC` 解決路徑問題，比合併磁碟安全。

## 安裝 Windows 時的注意事項

- Windows 安裝在 SSD 1。
- SSD 2 先保持未配置，進入 Windows 後再格式化。
- 避免 EFI 開機分割區被建立到 SSD 2。
- 若條件允許，安裝 Windows 時暫時拔除 SSD 2。

## 驗收

```powershell
Get-Disk
Get-Partition
Get-Volume
```

確認：

- Windows 位於 C:
- OPC 資料碟位於 D:
- 兩顆 SSD 都是 GPT
- 沒有跨碟 Spanned Volume
- 沒有誤建 RAID 0
