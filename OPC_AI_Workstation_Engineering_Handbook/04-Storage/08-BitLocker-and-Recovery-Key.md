# 04-Storage / 08 BitLocker 與恢復金鑰

## 目標

保護系統碟與 OPC 資料碟，同時避免因遺失恢復金鑰而無法取回資料。

## 白話說明

BitLocker 是 Windows 的磁碟加密功能。SSD 被拔走或電腦遺失時，沒有金鑰的人不能直接讀取資料。

## 採用原則

- 系統碟 C: 可啟用裝置加密或 BitLocker。
- 資料碟 D: 是否啟用，依備份與恢復能力決定。
- 啟用前先建立並驗證恢復金鑰保存位置。
- 恢復金鑰不可只存在被加密的同一台電腦。

## 查詢狀態

```powershell
manage-bde -status
Get-BitLockerVolume
```

## 恢復金鑰保存位置

至少保存兩份：

- Microsoft 帳號或受控密碼庫
- 離線外接儲存或紙本安全位置

不建議：

- 放在同一顆 D 槽
- 放在 Git repository
- 放在未加密的聊天紀錄
- 只截圖存在同一台電腦

## 重灌前確認

1. 查詢所有 Volume 的 BitLocker 狀態。
2. 確認 Recovery Key 可取得。
3. 記錄 Key ID 對應磁碟。
4. 確認備份可讀。

## AI Agent 權限

Agent 不應取得完整 BitLocker recovery key。Bootstrap 只應檢查 BitLocker 狀態與提示人工操作。

## 驗收

- Recovery key 有兩份獨立保存。
- 可以辨識每一組 key 對應哪個 Volume。
- 重開機後磁碟正常解鎖。
- 備份與還原流程不依賴單一金鑰來源。
