# 安裝 Windows 11

## 這一步在做什麼

把電腦恢復成乾淨、穩定、可以繼續安裝 WSL2 與 Docker 的狀態。

這一章最重要的不是安全術語，而是：

> 不要把錯的硬碟清掉。

---

## 開始前只確認三件事

1. 重要文件已經備份。
2. Windows 安裝 USB 可以使用。
3. 你知道哪一顆 SSD 是系統碟，哪一顆是資料碟。

如果第 3 點不確定，先不要進入刪除分割區的畫面。

BitLocker、TPM、Secure Boot 並不是本章必要門檻。

- 原本已啟用：保留即可。
- 沒有啟用：不影響安裝 OPC 工作站。

---

## 建議做法

如果方便，安裝 Windows 時先把資料 SSD 拔除，只留下系統 SSD。

這樣做的目的很單純：

> 降低選錯硬碟的機會。

如果不方便拔除，就用容量、型號與序號一起辨識，不要只看 `Disk 0` 或 `Disk 1`。

可先在舊 Windows 中查看：

```powershell
Get-PhysicalDisk | Select-Object FriendlyName,SerialNumber,MediaType,Size
Get-Disk | Select-Object Number,FriendlyName,SerialNumber,PartitionStyle,Size
Get-Volume | Select-Object DriveLetter,FileSystemLabel,FileSystem,Size,SizeRemaining
```

---

## 安裝順序

```text
準備官方 Windows 11 安裝 USB
→ 從 USB 開機
→ 選擇自訂安裝
→ 只刪除確認過的系統 SSD 分割區
→ 安裝 Windows 11
→ 完成首次設定
→ 執行 Windows Update
→ 安裝晶片組、網路、音訊與顯示卡驅動
→ 接回資料 SSD
→ 確認原本資料仍存在
```

Windows 映像只使用 Microsoft 官方來源，不使用網路上的精簡版或修改版。

---

## 安裝後檢查

```powershell
Get-ComputerInfo | Select-Object WindowsProductName,WindowsVersion,OsBuildNumber
Get-Disk
Get-Volume
Get-PnpDevice | Where-Object Status -ne 'OK'
```

完成標準：

- Windows 能正常開機。
- 網路、音訊與顯示卡正常。
- 資料 SSD 內容仍存在。
- 裝置管理員沒有重要未知裝置。

如果 `Get-PnpDevice` 顯示少量不影響使用的裝置，不必因為看見任何警告就重灌；先確認實際功能是否正常。

---

## 什麼情況一定要停止

- 你無法辨識哪一顆是系統 SSD。
- Windows 安裝畫面看不到預期的 SSD。
- 接回資料 SSD 後，Windows 要求初始化或格式化。
- 原本資料突然消失。

不要因為畫面出現格式化提示就直接按下確定。

---

## 可選進階項目

以下內容有需要再處理，不是本章主線：

- Secure Boot
- TPM
- BitLocker
- Recovery key
- BIOS 最佳化
- ISO checksum
- 完整 Recovery Package

它們可能有價值，但不應阻礙一般使用者完成 OPC 工作站。
