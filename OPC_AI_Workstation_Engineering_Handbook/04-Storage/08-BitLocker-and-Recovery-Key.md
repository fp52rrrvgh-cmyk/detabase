# 04-Storage / 08 BitLocker 與恢復金鑰

## 目標

保護系統碟與 OPC 資料碟，同時證明 recovery key 真的找得到、對得上、可在事故時使用。

## 白話說明

BitLocker 是 Windows 的磁碟加密功能。SSD 被拔走或電腦遺失時，沒有金鑰的人不能直接讀取資料。

但只要 recovery key 遺失，你自己也可能讀不到資料。Microsoft 無法替你重新建立遺失的 recovery key。

官方參考：

- https://support.microsoft.com/windows/finding-your-bitlocker-recovery-key-in-windows-6b71ad27-0b89-ea08-f143-056f5ab347d6
- https://support.microsoft.com/windows/back-up-your-bitlocker-recovery-key-e63607b4-77fb-4ad3-8022-d6dc428fbd0d

## Step 1：查目前狀態

以系統管理員 PowerShell 執行：

```powershell
manage-bde -status
Get-BitLockerVolume
```

你要確認：

- C 槽是否加密
- D 槽是否加密
- Protection Status
- Lock Status
- Encryption Percentage
- Key Protector 類型

## Step 2：列出 Key ID，不要把完整金鑰寫進日誌

```powershell
manage-bde -protectors -get C:
manage-bde -protectors -get D:
```

如果 D 槽不存在或沒有加密，第二個指令可能不適用。

只記錄 Key ID 與保存位置：

| 磁碟 | Volume Label | Key ID | recovery key 保存位置 1 | 保存位置 2 |
|---|---|---|---|---|
| C: |  |  |  |  |
| D: | OPC-DATA |  |  |  |

不要把完整 48 位 recovery key 放進：

- GitHub
- 驗收 JSON / Markdown
- PowerShell transcript
- Chat 記錄
- 截圖檔名

## Step 3：實際找回 recovery key

可能位置：

- Microsoft 帳號
- 公司 Entra ID / Active Directory
- 受控密碼庫
- 離線 USB
- 紙本安全位置

你必須真的打開保存位置，看到 48 位數 recovery key。

通過條件：

- Key ID 與 `manage-bde -protectors -get` 顯示的 ID 對得上。
- 能辨識這組 key 是 C: 還是 D:。
- 至少有兩個獨立保存位置。

只記得「以前好像有存」不算通過。

## Step 4：建立不含秘密的演練紀錄

建立紀錄時只寫：

```text
演練日期：
磁碟：C: / D:
Volume Label：
Key ID 末 8 碼：
保存位置 1：已確認 / 未確認
保存位置 2：已確認 / 未確認
完整 recovery key 是否被寫入紀錄：否
結果：PASS / FAIL
```

不要記錄完整 recovery key。

## Step 5：受控 Recovery 演練

### 安全層級 A：必要演練

不改 BIOS、不暫停保護，只做：

1. 執行 `manage-bde -protectors -get C:`。
2. 從外部保存位置找出對應 recovery key。
3. 核對 Key ID。
4. 關閉保存位置。
5. 保存不含秘密的 PASS/FAIL 紀錄。

這是每次重灌前都必須完成的最低演練。

### 安全層級 B：可選實機演練

只有同時符合以下條件才做：

- 已有完整外部備份。
- 已完成層級 A。
- 熟悉 BIOS 還原方式。
- 現場有人可處理無法開機。
- 沒有正在執行的重要工作。

可在維護窗口內，依主機板與 Microsoft 官方程序觸發一次受控 recovery 畫面，輸入對應 recovery key，確認能正常開機。

不要為了測試而：

- 清除 TPM
- 刪除 key protector
- 關閉 Secure Boot 後忘記還原
- 修改多個 BIOS 選項
- 在沒有外部備份時強制觸發 recovery

層級 B 失敗時，停止所有後續建置，不要重複猜測金鑰。

## Step 6：重灌與 BIOS 更新前再確認

以下操作前一定重新執行層級 A：

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
- 能接受硬體或 BIOS 變更時可能要求輸入 recovery key

若以上做不到，先不要加密 D 槽。

## Agent 權限

Agent 只能檢查 BitLocker 狀態，不得：

- 讀取完整 recovery key
- 將 recovery key 寫入 log
- 自行停用 BitLocker
- 自行新增或刪除 key protector
- 自行清除 TPM

## 完成條件

- [ ] C 槽 BitLocker 狀態已確認。
- [ ] D 槽 BitLocker 狀態已確認。
- [ ] 每組 Key ID 都知道對應哪個磁碟。
- [ ] Recovery key 至少保存兩份。
- [ ] 已完成層級 A 實際找回演練。
- [ ] 演練紀錄不含完整 recovery key。
- [ ] 完整 recovery key 沒有進入 GitHub、日誌或驗收報告。

## 停止條件

- 找不到 recovery key。
- Key ID 對不上。
- 磁碟顯示 Locked。
- 接回 SSD 後要求格式化。
- BIOS 更新前 BitLocker 狀態不明。
- 實機 recovery 畫面接受不了已保存的 key。

遇到以上狀況，不要重灌、不要格式化、不要初始化磁碟。