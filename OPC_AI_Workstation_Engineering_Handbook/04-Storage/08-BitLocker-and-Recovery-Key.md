# 04-Storage / 08 BitLocker 與恢復金鑰

## 目標

保護系統碟與 OPC 資料碟，同時避免因遺失 recovery key 而永久失去資料。

## 白話說明

BitLocker 是 Windows 的磁碟加密功能。SSD 被拔走或電腦遺失時，沒有金鑰的人不能直接讀取資料。

但只要 recovery key 遺失，你自己也可能讀不到資料。Microsoft 無法替你重新建立遺失的 recovery key。

官方參考：

- https://support.microsoft.com/windows/finding-your-bitlocker-recovery-key-in-windows-6b71ad27-0b89-ea08-f143-056f5ab347d6
- https://support.microsoft.com/windows/back-up-your-bitlocker-recovery-key-e63607b4-77fb-4ad3-8022-d6dc428fbd0d

## Step 1：先查目前狀態

以系統管理員 PowerShell 執行：

```powershell
manage-bde -status
Get-BitLockerVolume
```

你要看：

- C 槽是否加密
- D 槽是否加密
- Protection Status
- Lock Status
- Encryption Percentage

## Step 2：找出 recovery key

可能位置：

- Microsoft 帳號
- 列印紙本
- USB 隨身碟
- 受控密碼庫
- 公司 Entra ID / Active Directory（若是公司裝置）

你必須真的打開保存位置，看到 48 位數 recovery key。只記得「以前好像有存」不算。

## Step 3：把 Key ID 與磁碟對上

執行：

```powershell
manage-bde -protectors -get C:
manage-bde -protectors -get D:
```

如果 D 槽不存在或沒有加密，第二個指令可能不適用。

記錄：

| 磁碟 | Volume Label | Key ID | recovery key 保存位置 1 | 保存位置 2 |
|---|---|---|---|---|
| C: |  |  |  |  |
| D: | OPC-DATA |  |  |  |

不要把完整 48 位 recovery key 放進 GitHub。

## Step 4：保存至少兩份

至少兩個獨立位置：

1. Microsoft 帳號或可信任密碼庫
2. 離線 USB 或紙本安全位置

禁止只保存在：

- 同一台電腦
- 被加密的 D 槽
- Git repository
- 聊天紀錄
- 同一台電腦內的截圖

## Step 5：重灌與 BIOS 更新前再確認一次

以下操作前一定重新確認 recovery key：

- Windows 重灌
- BIOS 更新
- TPM 設定變更
- Secure Boot 設定變更
- 磁碟分割變更
- SSD 拆裝
- 啟用或停用 BitLocker

## 是否要加密 D 槽

只有同時符合以下條件才建議啟用：

- 已有至少兩份 recovery key
- 已有外部備份
- 已做過還原測試
- 能接受開機或硬體變更時可能要求輸入 recovery key

若以上做不到，先不要加密 D 槽。

## Agent 權限

Agent 只能檢查 BitLocker 狀態，不得：

- 讀取完整 recovery key
- 將 recovery key 寫入 log
- 自行停用 BitLocker
- 自行新增 key protector

## 完成條件

- [ ] C 槽 BitLocker 狀態已確認。
- [ ] D 槽 BitLocker 狀態已確認。
- [ ] 每組 Key ID 都知道對應哪個磁碟。
- [ ] recovery key 至少保存兩份。
- [ ] 已實際打開保存位置確認可取得。
- [ ] 完整 recovery key 沒有進入 GitHub 或日誌。

## 停止條件

- 找不到 recovery key。
- Key ID 對不上。
- 磁碟顯示 Locked。
- 接回 SSD 後要求格式化。
- BIOS 更新前 BitLocker 狀態不明。

遇到以上狀況，不要重灌、不要格式化、不要初始化磁碟。