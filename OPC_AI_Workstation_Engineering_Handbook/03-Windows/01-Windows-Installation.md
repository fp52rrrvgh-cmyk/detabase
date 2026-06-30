# 03-Windows / 01 Windows 11 全新安裝

## 目標

從完全清除資料的狀態，建立乾淨、可玩遊戲、可承載 WSL2 與 Docker 的 Windows 11 主機。

## 安裝前準備

- Windows 11 官方安裝 USB
- 主機板型號與驅動下載頁
- 顯示卡驅動來源
- Microsoft 帳號或本機帳號規劃
- 兩顆 M.2 SSD 的容量與型號紀錄

## 磁碟處理原則

安裝時只對系統碟建立 Windows 分割區。另一顆 SSD 先保持未配置，進入 Windows 後再建立資料碟，避免安裝程式把開機分割區寫到錯誤磁碟。

### 建議做法

1. 安裝 Windows 時，只保留預定作為系統碟的 M.2。
2. 若不方便實體拔除第二顆 SSD，至少在安裝畫面確認磁碟容量與型號。
3. 刪除系統碟上的舊分割區，讓安裝程式自動建立 EFI、MSR、Recovery 與 Windows 分割區。
4. 不建立跨碟 RAID 0、Spanned Volume 或 Storage Spaces。

## 安裝順序

1. BIOS 設定為 UEFI。
2. 保持 Secure Boot 開啟。
3. TPM 2.0 保持開啟。
4. 從 USB 開機。
5. 選擇自訂安裝。
6. 清除舊系統分割區。
7. 安裝 Windows 11。
8. 完成首次登入。
9. 先做 Windows Update，再裝額外工具。

## 小白註解

UEFI 是新式開機方式；Secure Boot 是防止未授權開機程式的保護；TPM 是 Windows 11 與 BitLocker 使用的安全模組。不要為了所謂效能優化把它們關掉。

## 驗收

在 PowerShell 執行：

```powershell
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber
Confirm-SecureBootUEFI
Get-Tpm
```

應確認：

- Windows 11 正常啟動
- Secure Boot 為 True
- TPM Present 與 Ready 為 True
- 裝置管理員沒有大量未知裝置

## 常見錯誤

- 把 Windows 裝在錯誤 SSD
- 第二顆 SSD 承載 EFI 分割區，日後拔掉就無法開機
- 使用來路不明的精簡映像
- 安裝後立刻跑 debloat script
