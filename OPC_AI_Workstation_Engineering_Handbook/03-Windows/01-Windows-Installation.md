# 03-Windows / 01 Windows 11 全新安裝

> **破壞性程序**：本章會刪除系統碟分割區。只要磁碟選錯，資料就可能永久遺失。沒有完成本章的備份、BitLocker 與磁碟識別關卡，不得進入安裝畫面的刪除步驟。

## 目標

從完整備份與可恢復狀態開始，建立乾淨、可玩遊戲、可承載 WSL2 與 Docker 的 Windows 11 主機。

## 官方來源

- Windows 11 官方下載：https://www.microsoft.com/software-download/windows11
- 建立 Windows 安裝媒體：https://support.microsoft.com/windows/create-installation-media-for-windows-99a58364-8c02-206f-aa6f-40c3b507420d
- Windows 11 發行資訊：https://learn.microsoft.com/windows/release-health/windows11-release-information
- Windows 11 硬體需求：https://learn.microsoft.com/windows/whats-new/windows-11-requirements

來源複查日期：2026-06-30。

## 版本選擇

截至 2026-06-30，既有一般 x64 裝置應以 Microsoft 官方下載頁實際提供的公開映像為準。Microsoft 的發行資訊說明：Windows 11 26H1 是為 2026 年初推出的新裝置設計，並不是提供既有 24H2 或 25H2 裝置就地升級的一般功能更新。因此不得因版本號較新，就自行下載來源不明的 26H1 映像。

安裝前記錄：

```text
下載日期：
下載來源：
ISO / Media Creation Tool：
Windows edition：
目標版本：
ISO SHA-256（若官方頁提供）：
```

## Gate 0：Recovery Package

以下資料必須保存在這台電腦以外的位置：

- GitHub repository 清單與尚未 push 的工作
- 個人文件、照片、下載檔與瀏覽器必要資料
- `D:\OPC` 中不可重新取得的資料
- PostgreSQL dump 與驗證 checksum
- BitLocker recovery key
- Microsoft、GitHub、Steam 與其他必要帳號的重新登入方式
- 主機板、GPU、網路卡與 SSD 型號
- 本手冊 repository URL 與已驗證 commit SHA

至少抽樣還原一個資料夾與一份 database dump。只有「複製完成」但沒有測試讀取，不算備份通過。

## Gate 1：BitLocker 與裝置加密

在系統管理員 PowerShell 執行：

```powershell
manage-bde -status
Get-BitLockerVolume
```

對每個已加密 Volume 記錄：

```text
Mount point：
Volume label：
Protection status：
Recovery key ID：
Recovery key 保存位置 1：
Recovery key 保存位置 2：
已實際確認可取得：是 / 否
```

Microsoft 明確說明其支援人員無法重新建立遺失的 recovery key。沒有確認 recovery key 可取得，就不得更新 BIOS、變更 TPM、重分割磁碟或重灌。

## Gate 2：兩顆 SSD 正面識別

在重灌前執行並保存輸出：

```powershell
Get-PhysicalDisk | Select-Object FriendlyName,SerialNumber,MediaType,Size
Get-Disk | Select-Object Number,FriendlyName,SerialNumber,PartitionStyle,Size
Get-Volume | Select-Object DriveLetter,FileSystemLabel,FileSystem,Size,SizeRemaining
```

建立人工對照表：

| 用途 | 型號 | 序號末碼 | 容量 | 安裝時預期磁碟 |
|---|---|---|---:|---|
| Windows 系統碟 |  |  |  | Disk ? |
| OPC 資料碟 |  |  |  | 不刪除 / 暫時拔除 |

只看 `Disk 0`、`Disk 1` 不足以辨識磁碟，因為編號可能改變。

## 安裝媒體

1. 只從 Microsoft 官方下載頁取得 Media Creation Tool 或 ISO。
2. 使用空白、至少 8 GB 的 USB；建立安裝媒體會刪除 USB 原內容。
3. 建立完成後重新插拔 USB，確認可讀。
4. 不使用精簡版、魔改版、網路論壇映像或來路不明的 bypass 映像。

## 磁碟處理原則

最安全方案：安裝 Windows 時，實體拔除 OPC 資料 SSD，只保留目標系統 SSD。這可降低選錯磁碟，以及 EFI 開機分割區被建立到另一顆 SSD 的風險。

若無法拔除第二顆 SSD：

1. 使用前述型號、序號末碼與容量辨識。
2. 在刪除任何分割區前再次核對。
3. 不依賴磁碟編號。
4. 無法確定時立即取消安裝，不猜測。

## BIOS / UEFI Gate

記錄變更前設定，確認：

- UEFI mode
- Secure Boot enabled
- TPM 2.0 enabled
- Intel VT-x / AMD SVM enabled
- SATA / storage mode 維持既有正確設定，除非主機板官方文件要求變更

不要為了所謂效能最佳化關閉 Secure Boot、TPM 或虛擬化。

## 安裝順序

1. 斷開或明確隔離 OPC 資料 SSD。
2. 從官方 Windows USB 以 UEFI 模式開機。
3. 選擇自訂安裝。
4. 只在已正面識別的系統 SSD 上刪除舊 Windows 分割區。
5. 選擇該 SSD 的未配置空間，讓 Windows Setup 建立所需分割區。
6. 完成安裝與首次設定。
7. 先執行 Windows Update。
8. 安裝晶片組、網路、音訊與 GPU 官方驅動。
9. 關機後重新接回 OPC 資料 SSD。
10. 啟動後先確認磁碟與 BitLocker 狀態，不初始化、不格式化既有資料碟。

## 首次啟動後驗收

```powershell
Get-ComputerInfo | Select-Object WindowsProductName,WindowsVersion,OsBuildNumber
Confirm-SecureBootUEFI
Get-Tpm
Get-Disk
Get-Partition
Get-Volume
manage-bde -status
```

確認：

- Windows 正常啟動並已啟用
- Secure Boot 為 True
- TPM Present 與 Ready 為 True
- Windows boot / EFI 分割區位於預期系統 SSD
- OPC 資料 SSD 內容仍存在
- 沒有被意外初始化或格式化的磁碟
- 裝置管理員沒有未知裝置

## 立即停止條件

出現下列任一情況，停止施工並保存畫面：

- 安裝畫面無法辨識哪一顆是系統 SSD
- Recovery key 無法取得
- 備份無法抽樣還原
- Windows Setup 看不到預期 SSD
- 接回資料 SSD 後要求格式化
- BitLocker recovery 畫面顯示的 Key ID 與保存紀錄不一致
- 裝置管理員出現大量未知裝置或儲存控制器異常

## 常見錯誤

- 只用容量猜測磁碟，沒有核對型號與序號
- 把 Windows 裝到錯誤 SSD
- 第二顆 SSD 承載 EFI 分割區，日後拔掉就無法開機
- 重灌前沒有驗證 BitLocker recovery key
- 使用來路不明的精簡映像
- 安裝後立刻執行 debloat script
- 接回資料 SSD 後看到提示就按下初始化或格式化
